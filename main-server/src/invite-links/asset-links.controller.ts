// AI-generated with Claude Opus 5.5, 2026-10-05, prompted by fyoon46, reviewed by TaeHyun79 in #40
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/public.decorator.js';
import { Settings } from '../common/settings.js';

const ANDROID_PACKAGE_NAME = 'com.bonnieandclaude.snunow';

// Android reads this file to let the app open the server's https links, the Invite Links among them (App Links). It
// asks without a token and follows no redirect.
@Public()
@Controller('.well-known')
export class AssetLinksController {
  constructor(private readonly settings: ConfigService<Settings, true>) {}

  @Get('assetlinks.json')
  assetLinks(): object[] {
    return [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: ANDROID_PACKAGE_NAME,
          sha256_cert_fingerprints: this.settings.get('ANDROID_CERTIFICATE_FINGERPRINTS', { infer: true }),
        },
      },
    ];
  }
}
