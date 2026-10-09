# AI-generated with Claude Opus 5.5, 2026-10-06, prompted by Jaehyun0320
Pod::Spec.new do |s|
  s.name           = 'SnuNowMap'
  s.version        = '1.0.0'
  s.summary        = "Kakao's map behind the app's map component"
  s.description    = "Kakao's map behind the app's map component, to the rules of src/map/types.ts"
  s.license        = 'UNLICENSED'
  s.author         = 'SNU Now'
  s.homepage       = 'https://github.com/snuhcs-course/swpp-2026-project-team-09'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  # Kakao Maps SDK for iOS, from CocoaPods. Its framework has a slice for the simulator on Apple Silicon.
  s.dependency 'KakaoMapsSDK', '2.12.19'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '**/*.swift'
end
