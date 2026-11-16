import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const checks = [];
function check(label, ready, next) {
  checks.push({ label, ready });
  console.log(`${ready ? 'OK' : 'NOG NODIG'}  ${label}${ready ? '' : ` — ${next}`}`);
}
function run(command, args) { try { return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } }
check('iOS-project', existsSync(join(root, 'ios/App/App.xcodeproj')), 'npm run ios:sync');
check('Android-project', existsSync(join(root, 'android/app/build.gradle')), 'npm run android:sync');
const ios = readFileSync(join(root, 'ios/App/App/Info.plist'), 'utf8');
const android = readFileSync(join(root, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
check('iPhone camera- en microfoontoestemming', ios.includes('NSCameraUsageDescription') && ios.includes('NSMicrophoneUsageDescription'), 'Info.plist bijwerken');
check('Android camera- en microfoontoestemming', android.includes('android.permission.CAMERA') && android.includes('android.permission.RECORD_AUDIO'), 'AndroidManifest.xml bijwerken');
const xcode = run('xcodebuild', ['-version']);
check('Volledige Xcode actief', xcode.startsWith('Xcode '), 'Installeer Xcode via de Mac App Store en open de app één keer');
check('Android Studio', existsSync('/Applications/Android Studio.app'), 'Installeer Android Studio en doorloop de Standard Setup');
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || join(homedir(), 'Library/Android/sdk');
check('Android SDK en adb', existsSync(join(sdk, 'platform-tools/adb')), 'Open Android Studio → More Actions → SDK Manager');
check('Android API 36', existsSync(join(sdk, 'platforms/android-36/android.jar')), 'Installeer Android SDK Platform 36 via SDK Manager');
const project = readFileSync(join(root, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8');
check('Apple signing team', /DEVELOPMENT_TEAM\s*=\s*[A-Z0-9]{10}\s*;/.test(project), 'Xcode → Settings → Accounts; kies je team onder Signing & Capabilities');
check('Android release signing', Boolean(process.env.SIMPLY_ANDROID_KEYSTORE) || existsSync(join(root, 'android/keystore.properties')), 'Configureer een eigen upload key vóór de Play Store-build');
console.log('\nDit controleert lokale instellingen. Apple/Google-accountstatus, store-review en echte telefoontests worden hier niet mee bevestigd.');
process.exitCode = checks.every(c => c.ready) ? 0 : 1;
