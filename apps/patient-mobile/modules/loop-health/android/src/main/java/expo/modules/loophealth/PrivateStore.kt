package expo.modules.loophealth
import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.KeyGenerator
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import java.io.File
class PrivateStore(private val context:Context){
 companion object { private val lock=Any() }
 private val directory get()=File(context.noBackupFilesDir,"loop-private").also{it.mkdirs()}
 private fun file(name:String):File {require(name.matches(Regex("[a-zA-Z0-9-]+")));return File(directory,name)}
 private fun key():SecretKey = synchronized(lock) {val store=KeyStore.getInstance("AndroidKeyStore").apply{load(null)};(store.getKey("loop-data",null) as? SecretKey)?:KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore").apply{init(KeyGenParameterSpec.Builder("loop-data",KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())}.generateKey()}
 @Synchronized fun write(name:String,value:String){val cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());val target=file(name);val tmp=File(directory,"$name.tmp");tmp.writeBytes(cipher.iv+cipher.doFinal(value.toByteArray(Charsets.UTF_8)));check(tmp.renameTo(target)){"Unable to persist encrypted data"}}
 @Synchronized fun read(name:String):String? {val f=file(name);if(!f.exists())return null;val bytes=f.readBytes();val cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),GCMParameterSpec(128,bytes.copyOfRange(0,12)));return String(cipher.doFinal(bytes.copyOfRange(12,bytes.size)),Charsets.UTF_8)}
 fun delete(name:String){file(name).delete()}
 fun clear(){directory.listFiles()?.forEach{it.delete()}}
}
