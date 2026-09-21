Pod::Spec.new do |s|
  s.name = 'LoopHealth'
  s.version = '0.1.0'
  s.summary = 'LNS Loop HealthKit and private storage'
  s.description = 'Read-only, consent-scoped HealthKit integration.'
  s.license = { :type => 'UNLICENSED' }
  s.author = 'Smileon Labs'
  s.homepage = 'https://github.com/SmileonLabs/lnsloop'
  s.platforms = { :ios => '16.4' }
  s.source = { :git => 'https://github.com/SmileonLabs/lnsloop.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'HealthKit', 'Security', 'UserNotifications'
  s.source_files = '**/*.{h,m,mm,swift}'
  s.swift_version = '5.9'
end
