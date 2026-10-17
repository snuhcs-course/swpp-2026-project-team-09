################################################################################
# AI-generated with Claude
#
# 2026-10-18  Opus 5.5   prompted by AhnJinYoung
################################################################################

Pod::Spec.new do |s|
  s.name           = 'SnuNowOcr'
  s.version        = '1.0.0'
  s.summary        = "ML Kit's Korean text recognition behind the timetable import"
  s.description    = "Reads an image's text with ML Kit Text Recognition v2 (Korean) and returns a small RGBA copy"
  s.license        = 'UNLICENSED'
  s.author         = 'SNU Now'
  s.homepage       = 'https://github.com/snuhcs-course/swpp-2026-project-team-09'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  # ML Kit's Korean recogniser, from CocoaPods, with its model bundled in the pod. ML Kit's frameworks are static.
  s.dependency 'GoogleMLKit/TextRecognitionKorean', '>= 7.0.0'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '**/*.swift'
end
