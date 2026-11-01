################################################################################
# AI-generated with Claude
#
# 2026-11-01  Opus 5.5   prompted by AhnJinYoung
################################################################################

Pod::Spec.new do |s|
  s.name           = 'SnuNowWebCookies'
  s.version        = '1.0.0'
  s.summary        = "Clears the web views' cookies at the library's logout"
  s.description    = "Removes every cookie of WKWebsiteDataStore and HTTPCookieStorage; it has no way to read one"
  s.license        = 'UNLICENSED'
  s.author         = 'SNU Now'
  s.homepage       = 'https://github.com/snuhcs-course/swpp-2026-project-team-09'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '**/*.swift'
end
