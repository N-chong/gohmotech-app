import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Android production release configuration', () => {
  const capacitorConfig = readProjectFile('capacitor.config.ts');
  const buildGradle = readProjectFile('android/app/build.gradle');
  const androidGitignore = readProjectFile('android/.gitignore');

  it('preserves the application identity and increments the Android release version', () => {
    expect(capacitorConfig).toContain("appId: 'com.gohmotech.owner'");
    expect(buildGradle).toContain('namespace = "com.gohmotech.owner"');
    expect(buildGradle).toContain('applicationId "com.gohmotech.owner"');
    expect(buildGradle).toContain('versionCode 16');
    expect(buildGradle).toContain('versionName "1.6"');
  });

  it('requires explicit release credentials and never configures debug signing for release', () => {
    expect(buildGradle).toContain("tasks.register('validateGohMoTechReleaseSigning')");
    expect(buildGradle).toContain('gohMoTechMissingSigningKeys');
    expect(buildGradle).toContain('task.dependsOn(validateGohMoTechReleaseSigning)');
    expect(buildGradle).not.toContain('signingConfig signingConfigs.debug');
  });

  it('keeps signing credentials and keystores out of Git', () => {
    expect(androidGitignore).toContain('signing.properties');
    expect(androidGitignore).toContain('*.jks');
    expect(androidGitignore).toContain('*.keystore');
    expect(androidGitignore).toContain('*.p12');
  });
});
