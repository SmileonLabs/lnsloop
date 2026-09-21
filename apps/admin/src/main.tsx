import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { studySchema, kinds, type StudyConfig } from "@loop/contracts";
import "./style.css";
const base = (import.meta as any).env.VITE_API_URL ?? "http://localhost:4000";
const blank: StudyConfig = {
  title: { ko: "", en: "" },
  description: { ko: "", en: "" },
  recipient: "",
  startsAt: new Date().toISOString(),
  endsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
  types: ["steps", "sleep"],
  consent: { ko: "", en: "" },
  retentionDays: 30,
  points: 0,
  surveyPoints: 0,
  periodDays: 1,
  autoApprove: false,
  minimumRecords: 1,
  eligibility: [],
  survey: [],
  testOnly: true,
};
function App() {
  const [token, setToken] = useState(""),
    [tab, setTab] = useState("studies"),
    [items, setItems] = useState<any[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [config, setConfig] = useState<StudyConfig>(blank),
    [selected, setSelected] = useState(""),
    [details, setDetails] = useState<any>(null),
    [testAuth, setTestAuth] = useState(false);
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (token || !clientId) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      const google = (window as any).google;
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (r: any) =>
          void action(() => login("/auth/google", { idToken: r.credential })),
      });
      const target = document.getElementById("google-login");
      if (target)
        google.accounts.id.renderButton(target, {
          theme: "filled_black",
          size: "large",
          text: "signin_with",
        });
    };
    script.onerror = () =>
      setError("Google 로그인 서비스를 불러오지 못했습니다.");
    document.head.appendChild(script);
    return () => script.remove();
  }, [token]);
  async function api(path: string, method = "GET", body?: unknown) {
    const r = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const b = await r.json();
    if (!r.ok) throw new Error(b.error ?? "Request failed");
    return b;
  }
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  const reload = async () => {
    setItems(await api("/admin/" + tab));
  };
  useEffect(() => {
    fetch(base + "/auth/config")
      .then((r) => r.json())
      .then((c) => setTestAuth(c.testAuth))
      .catch(() => setError("서버 연결 실패"));
  }, []);
  useEffect(() => {
    if (token && tab !== "points") void action(reload);
  }, [token, tab]);
  const update = (key: string, value: any) =>
    setConfig((c) => ({ ...c, [key]: value }));
  const login = async (path: string, body: any) => {
    const r = await api(path, "POST", body);
    if (r.user.role !== "admin") throw new Error("관리자 권한이 필요합니다");
    setToken(r.token);
  };
  return (
    <div className="shell">
      <header>
        <strong>∞ LNS Loop</strong>
        <span>Operations</span>
        {token && (
          <button
            onClick={() =>
              void action(async () => {
                await api("/auth/logout", "POST");
                setToken("");
              })
            }
          >
            로그아웃
          </button>
        )}
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!token ? (
        <main>
          <h1>운영자 로그인</h1>
          <p>등록된 운영자 Google 계정으로 로그인해주세요.</p>
          <div id="google-login" />
          {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
            <p>Google 로그인 설정 대기 중</p>
          )}
          {testAuth && (
            <button
              onClick={() =>
                void action(() => login("/auth/test", { subject: "operator" }))
              }
            >
              개발 테스트 운영자 로그인
            </button>
          )}
        </main>
      ) : (
        <>
          <nav>
            {[
              ["studies", "연구"],
              ["submissions", "제출 검토"],
              ["enrollments", "참여 현황"],
              ["points", "포인트 조정"],
              ["deletions", "삭제 요청"],
            ].map(([id, name]) => (
              <button
                className={tab === id ? "active" : ""}
                key={id}
                onClick={() => {
                  setTab(id);
                  setDetails(null);
                }}
              >
                {name}
              </button>
            ))}
          </nav>
          <main>
            <h1>
              {tab === "studies"
                ? "연구 관리"
                : tab === "submissions"
                  ? "제출 검토"
                  : tab === "points"
                    ? "포인트 조정"
                    : tab === "enrollments"
                      ? "참여 현황"
                      : "삭제 요청"}
            </h1>
            {busy && <p role="status">처리 중…</p>}
            {tab === "studies" ? (
              <div className="columns">
                <section>
                  <button
                    onClick={() => {
                      setSelected("");
                      setConfig(blank);
                    }}
                  >
                    새 연구
                  </button>
                  {items.map((s) => (
                    <article key={s.id}>
                      <h2>{s.config.title.ko}</h2>
                      <p>
                        {s.status} · v{s.version} · {s.config.points} P
                      </p>
                      <button
                        onClick={() => {
                          setSelected(s.id);
                          setConfig(s.config);
                        }}
                      >
                        편집 / 새 버전
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => {
                          const ref = prompt("연구 승인·운영 검토 참조 번호");
                          if (ref)
                            void action(async () => {
                              await api(
                                `/admin/studies/${s.id}/status`,
                                "POST",
                                {
                                  status:
                                    s.status === "published"
                                      ? "closed"
                                      : "published",
                                  approvalReference: ref,
                                },
                              );
                              await reload();
                            });
                        }}
                      >
                        {s.status === "published" ? "종료" : "발행"}
                      </button>
                      <button
                        onClick={() =>
                          void action(async () => {
                            const e = await api("/admin/exports", "POST", {
                              studyId: s.id,
                            });
                            const data = await api(e.download);
                            const link = document.createElement("a");
                            const url = URL.createObjectURL(
                              new Blob([JSON.stringify(data, null, 2)], {
                                type: "application/json",
                              }),
                            );
                            link.href = url;
                            link.download = "research-export.json";
                            link.click();
                            URL.revokeObjectURL(url);
                          })
                        }
                      >
                        승인 데이터 내보내기
                      </button>
                    </article>
                  ))}
                </section>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void action(async () => {
                      const c = studySchema.parse(config);
                      await api(
                        selected
                          ? "/admin/studies/" + selected
                          : "/admin/studies",
                        selected ? "PUT" : "POST",
                        c,
                      );
                      setSelected("");
                      setConfig(blank);
                      await reload();
                    });
                  }}
                >
                  <h2>{selected ? "새 버전 초안" : "새 연구 초안"}</h2>
                  {(["title", "description", "consent"] as const).map((key) => (
                    <React.Fragment key={key}>
                      {(["ko", "en"] as const).map((lang) => (
                        <label key={lang}>
                          {key} ({lang})
                          <textarea
                            required
                            value={config[key][lang]}
                            onChange={(e) =>
                              update(key, {
                                ...config[key],
                                [lang]: e.target.value,
                              })
                            }
                          />
                        </label>
                      ))}
                    </React.Fragment>
                  ))}
                  <label>
                    제공 기관
                    <input
                      required
                      value={config.recipient}
                      onChange={(e) => update("recipient", e.target.value)}
                    />
                  </label>
                  {(["startsAt", "endsAt"] as const).map((key) => (
                    <label key={key}>
                      {key}
                      <input
                        required
                        value={config[key]}
                        onChange={(e) => update(key, e.target.value)}
                      />
                    </label>
                  ))}
                  <fieldset>
                    <legend>수집 항목</legend>
                    {kinds.map((k) => (
                      <label className="check" key={k}>
                        <input
                          type="checkbox"
                          checked={config.types.includes(k)}
                          onChange={(e) =>
                            update(
                              "types",
                              e.target.checked
                                ? [...config.types, k]
                                : config.types.filter((t) => t !== k),
                            )
                          }
                        />
                        {k}
                      </label>
                    ))}
                  </fieldset>
                  {(
                    [
                      "points",
                      "surveyPoints",
                      "periodDays",
                      "minimumRecords",
                      "retentionDays",
                    ] as const
                  ).map((k) => (
                    <label key={k}>
                      {k}
                      <input
                        type="number"
                        value={config[k]}
                        min={0}
                        onChange={(e) => update(k, Number(e.target.value))}
                      />
                    </label>
                  ))}
                  {(["autoApprove", "testOnly"] as const).map((k) => (
                    <label className="check" key={k}>
                      <input
                        type="checkbox"
                        checked={config[k]}
                        onChange={(e) => update(k, e.target.checked)}
                      />
                      {k}
                    </label>
                  ))}
                  <fieldset>
                    <legend>개별 동의 항목</legend>
                    {(config.consentItems ?? []).map((c, i) => (
                      <section key={c.id}>
                        {(["ko", "en"] as const).map((lang) => (
                          <label key={lang}>
                            동의 문구 ({lang})
                            <input
                              value={c.label[lang]}
                              onChange={(e) =>
                                update(
                                  "consentItems",
                                  (config.consentItems ?? []).map((x, n) =>
                                    n === i
                                      ? {
                                          ...x,
                                          label: {
                                            ...x.label,
                                            [lang]: e.target.value,
                                          },
                                        }
                                      : x,
                                  ),
                                )
                              }
                            />
                          </label>
                        ))}
                        <label className="check">
                          <input
                            type="checkbox"
                            checked={c.required}
                            onChange={(e) =>
                              update(
                                "consentItems",
                                (config.consentItems ?? []).map((x, n) =>
                                  n === i
                                    ? { ...x, required: e.target.checked }
                                    : x,
                                ),
                              )
                            }
                          />
                          필수
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            update(
                              "consentItems",
                              (config.consentItems ?? []).filter(
                                (_, n) => n !== i,
                              ),
                            )
                          }
                        >
                          항목 삭제
                        </button>
                      </section>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        update("consentItems", [
                          ...(config.consentItems ?? []),
                          {
                            id: crypto.randomUUID(),
                            label: { ko: "", en: "" },
                            required: true,
                          },
                        ])
                      }
                    >
                      동의 항목 추가
                    </button>
                  </fieldset>
                  <QuestionEditor
                    title="적합성"
                    value={config.eligibility}
                    onChange={(v) => update("eligibility", v)}
                  />
                  <QuestionEditor
                    title="설문"
                    value={config.survey}
                    onChange={(v) => update("survey", v)}
                  />
                  <button disabled={busy}>초안 저장</button>
                </form>
              </div>
            ) : tab === "points" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const d = new FormData(e.currentTarget);
                  void action(async () => {
                    await api("/admin/points/adjust", "POST", {
                      userId: d.get("userId"),
                      amount: Number(d.get("amount")),
                      reason: d.get("reason"),
                      eventId: crypto.randomUUID(),
                    });
                    setDetails({ result: "조정 완료" });
                  });
                }}
              >
                <label>
                  사용자 ID
                  <input name="userId" required />
                </label>
                <label>
                  증감 점수
                  <input name="amount" type="number" required />
                </label>
                <label>
                  사유
                  <input name="reason" required />
                </label>
                <button disabled={busy}>조정 기록</button>
              </form>
            ) : (
              <section>
                {items.length === 0 && <p>표시할 항목이 없습니다.</p>}
                {items.map((item, i) => (
                  <article key={item.id ?? i}>
                    <p>{item.id ?? item.user_id}</p>
                    <p>{item.status ?? item.nickname ?? item.study_id}</p>
                    {tab === "submissions" && (
                      <>
                        <button
                          onClick={() =>
                            void action(async () =>
                              setDetails(
                                await api("/admin/submissions/" + item.id),
                              ),
                            )
                          }
                        >
                          데이터 확인
                        </button>
                        {["approved", "needs_correction", "rejected"].map(
                          (status) => (
                            <button
                              disabled={busy || item.status === "approved"}
                              key={status}
                              onClick={() => {
                                const reason = prompt("검토 사유");
                                if (reason)
                                  void action(async () => {
                                    await api(
                                      `/admin/submissions/${item.id}/review`,
                                      "POST",
                                      { status, reason },
                                    );
                                    await reload();
                                  });
                              }}
                            >
                              {status}
                            </button>
                          ),
                        )}
                      </>
                    )}
                    {tab === "deletions" && (
                      <button
                        disabled={busy}
                        onClick={() => {
                          if (
                            confirm(
                              "보존 기간이 종료된 계정의 데이터를 삭제합니다.",
                            )
                          )
                            void action(async () => {
                              await api(
                                "/admin/deletions/" + item.id,
                                "POST",
                                {},
                              );
                              await reload();
                            });
                        }}
                      >
                        삭제 처리
                      </button>
                    )}
                    {tab === "enrollments" && (
                      <p>
                        {item.withdrawn_at ? "철회" : "참여 중"} · 동의 v
                        {item.version}
                      </p>
                    )}
                  </article>
                ))}
              </section>
            )}
            {details && (
              <section>
                <h2>상세</h2>
                <pre>{JSON.stringify(details, null, 2)}</pre>
                <button onClick={() => setDetails(null)}>닫기</button>
              </section>
            )}
          </main>
        </>
      )}
    </div>
  );
}
function QuestionEditor({
  title,
  value,
  onChange,
}: {
  title: string;
  value: StudyConfig["survey"];
  onChange: (v: StudyConfig["survey"]) => void;
}) {
  return (
    <fieldset>
      <legend>{title}</legend>
      {value.map((q, i) => (
        <section key={q.id}>
          {(["ko", "en"] as const).map((lang) => (
            <label key={lang}>
              질문 ({lang})
              <input
                value={q.label[lang]}
                onChange={(e) =>
                  onChange(
                    value.map((x, n) =>
                      n === i
                        ? {
                            ...x,
                            label: { ...x.label, [lang]: e.target.value },
                          }
                        : x,
                    ),
                  )
                }
              />
            </label>
          ))}
          <label>
            선택지 (쉼표 구분)
            <input
              value={q.options.join(",")}
              onChange={(e) =>
                onChange(
                  value.map((x, n) =>
                    n === i ? { ...x, options: e.target.value.split(",") } : x,
                  ),
                )
              }
            />
          </label>
          {title === "적합성" && (
            <label>
              적합 응답 (비우면 모두 허용)
              <input
                value={q.eligibleAnswer ?? ""}
                onChange={(e) =>
                  onChange(
                    value.map((x, n) =>
                      n === i
                        ? { ...x, eligibleAnswer: e.target.value || undefined }
                        : x,
                    ),
                  )
                }
              />
            </label>
          )}
          <button
            type="button"
            onClick={() => onChange(value.filter((_, n) => n !== i))}
          >
            질문 삭제
          </button>
        </section>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([
            ...value,
            {
              id: crypto.randomUUID(),
              label: { ko: "", en: "" },
              options: ["Yes", "No"],
            },
          ])
        }
      >
        질문 추가
      </button>
    </fieldset>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
