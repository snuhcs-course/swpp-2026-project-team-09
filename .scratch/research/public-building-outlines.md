# Public building outlines: government open data against OpenStreetMap

Whether the building footprints that the Korean government publishes are better than the OpenStreetMap outlines the project stores (`main-server/seed/openstreetmap-building-outlines.geojson`), and whether the project may store them. It continues `external-sources.md` §6.

Everything was checked on 2026-10-03. `[V1]`-style links point to the Sources list at the end. "My judgement" marks conclusions that no source states directly.

## 1. Summary

| Source | Publisher | Access | Licence | Obtained |
|---|---|---|---|---|
| GIS건물통합정보, SHP by province | 국토교통부 | VWorld download, login | CC BY on VWorld, 공공누리 type 1 on data.go.kr | Yes, on 2026-10-03, after a person logged in and downloaded it |
| 연속수치지형도 건물, SHP, whole country | 국토지리정보원 | VWorld download, login | CC BY on VWorld, 공공누리 type 1 on data.go.kr | Yes, on 2026-10-03, after a person logged in and downloaded it |
| 국가기본도 건물, SHP, whole country | 국토지리정보원 | VWorld download, login | None stated | No |
| 수치지형도 2.0, by map sheet | 국토지리정보원 | map.ngii.go.kr, login | 공공누리 type 1 | No |
| 도로명주소 건물 (`TL_SPBD_BULD`), SHP by province | 행정안전부 | VWorld download, login | CC BY-NC-ND | No |
| 도로명주소 전자지도 (`TL_SPBD_BULD`) | 행정안전부 | business.juso.go.kr: identity check, application, approval, security pledge | 공공누리 type 1 on data.go.kr; the pledge forbids taking it abroad | No |
| The same layers through VWorld's Data API and WFS | 국토교통부 | API key, tied to a member and a service URL | Terms forbid storing without prior consent | No |
| 서울시 건물 태양에너지 등급도 (2018) | 서울특별시 | Direct download, no login | 공공누리 type 1, third-party rights marked | Yes, but it holds points, not outlines |

- No government source gives building polygons without a login, an API key or an application. A person logged in at VWorld and downloaded GIS건물통합정보 for Seoul, base date 2026-09-09, and the comparison was run on it (§9).
- The result for 연속수치지형도 건물, the 국토지리정보원's layer: it is the best of the three on this campus. Counting only what it classes as a building, it draws 192 of the 218 numbered buildings where OpenStreetMap draws 183, it is of 2024, it has 문화관 (73동), 해동첨단공학관 (303동) and 배터리공동연구센터, and its labels name the building number of 172 of the 218, every one of them at the campus map's point for that number (§9.2). A person then checked every large difference between it and OpenStreetMap against Kakao's map: where the two outlines of a building differ much, it was the right one for 22 of 26 buildings and OpenStreetMap for 2 (§9.3).
- The result for GIS건물통합정보: on this campus its outlines are not better than OpenStreetMap's. Where both draw a building they agree to about 2 m and both lie on Kakao's drawing of it. The government file lacks 14 of the campus's numbered buildings that OpenStreetMap draws, among them 유회진 학술정보관 (300동), 우석경제관 (223동) and 중앙도서관 관정관, and holds no building approved after 2013. It adds 10 that OpenStreetMap lacks, 문화관 (73동) and nine small ones.
- My judgement: of the sources, GIS건물통합정보 is the one to try first. Its licence allows a derived copy in a public repository, it is refreshed monthly, one province file covers the campus, and it carries a building name (건물명) and a wing name (건물동명).
- My judgement: the road name address layer must not be stored, by either route (§5).
- The one file that could be obtained, Seoul's, holds one point per building part. What it shows is in §7.
- My judgement: GIS건물통합정보 is not worth taking. 연속수치지형도 건물 is the better source for the outlines, in what it covers, in how its outlines lie, and for linking an outline to a building by its number rather than by position. A few buildings would still come from OpenStreetMap or be corrected by hand (§9.3). Against it: a person must log in and download ten files of about 220 MB each to find the one with the campus, it is renewed once a year, and the export, the loader and their tests would be written anew. The outlines serve only the lookup of the building at a position, which nothing calls yet, so the change fits the feature that does (P08).

## 2. VWorld: accounts, keys and terms

VWorld (`vworld.kr`, 국토교통부) is where the Ministry's building layers come out, and where data.go.kr sends the reader for them [D1][D3].

- File downloads need a login. The download buttons answer "로그인 후 이용해주세요" to a visitor who is not signed in [V6].
- Sign-up has four steps: agree to the terms, identity verification (본인인증), enter details, done [V12].
- Every API needs a key. A Data API request without one was answered with `PARAM_REQUIRED`, "필수 파라미터인 key가 없어서" [V2].
- A key is issued to a signed-in member who agrees to the terms and enters the domain and directory of the website that will use it, and contact details. A development key comes first; a key for operation is applied for and reviewed before the development key expires [V4]. A request from outside a browser adds `domain=` with the URL entered at issue [V2][V3].
- The key may be used only by the member it was issued to [V4].
- Terms, article 19: a member may not copy, alter, publish or hand on information obtained through the service without prior consent, and "사전 승낙 없이 데이터를 무단으로 저장하지 못합니다" [V4].
- Copyright policy: works the Ministry fully owns are free to use where the 공공누리 type 1 mark is attached, with the source shown; for anything without the mark, ask the department first. Public data is open to anyone, commercial use included, under 공공데이터법 [V5].
- The download pages state a licence per dataset. The terms and the per-dataset licence do not refer to each other.
  - My judgement: a file downloaded under a stated CC BY or 공공누리 type 1 licence may be stored and redistributed. Data pulled through the API falls under article 19 and is displayed, not kept, unless consent is obtained.

## 3. GIS건물통합정보 (국토교통부)

- What it is: one polygon per building, joining a building shape with the attributes of the building register (건축물대장, 세움터) [V6]. data.go.kr describes the shape's origin in two ways: built on the continuous cadastral map [D1], and taken from the building layer of the 국토지리정보원's continuous digital map [D2].
- Size and freshness: 14,422,486 records nationwide. A full file per province monthly, a nationwide change file daily [V6].
  - The Seoul full file is 129 MB; the newest has base date 2026-09-09. Change files up to base date 2026-10-01 were listed on 2026-10-03 [V6].
- Format: SHP. EPSG:5186 for base dates from 2023-08-08; EPSG:5174 before [V6].
- Attributes, named `A0` to `A28` in the file [V7]:
  - Identifiers: source shape ID, GIS건물통합식별번호 (28 characters), parcel number (PNU), legal-district code and name, lot number, 건축물ID, a link key to the reference system.
  - `A24` 건물명 and `A25` 건물동명. The spec's sample values are an apartment's name and `주건축물제1동`.
  - Use, structure, footprint area, approval date, total floor area, height, floors above and below ground, coverage ratios, base date.
  - No campus building number as a field of its own.
- Also served as WFS, `https://api.vworld.kr/ned/wfs/getBldgisSpceWFS`, layer `dt_d010`, at most 1,000 features a request, with a key. The WFS output lists no building name [V11]. data.go.kr lists the same service; its link leads to VWorld [D6].
- Licence: "CC BY" on the VWorld page [V6]; 공공누리 type 1 on data.go.kr [D1].
- Caveats the publisher states: the data is for information and has no legal force [V6]; the builders differ across the country, so use it for reference [D1].

## 4. 국토지리정보원: 연속수치지형도, 국가기본도, 수치지형도

- 연속수치지형도 건물 on VWorld: the building layer of the continuous digital topographic map. SHP, EPSG:5179, renewed yearly, files last renewed 2026-10-01. It comes as ten numbered ZIP files, `(연속수치지형도)건물_001.zip` to `_010.zip`, 203 to 241 MB each and not named by region, with a description of the data and its table design as two further files. Licence "CC BY" [V8]; 공공누리 type 1 on data.go.kr [D3]. Login needed.
- 국가기본도 건물 on VWorld: SHP, EPSG:5179, yearly, one 2,044 MB file with a table definition beside it. No licence is stated on its page [V10]. Login needed.
- 수치지형도 2.0 on `map.ngii.go.kr`: found by a location search and downloaded after login, in the Institute's NGI format [D5][N2]. The features carry a unique identifier (UFID) [D5]. 공공누리 type 1 [D5].
- The Institute's copyright policy: free use of works marked 공공누리 type 1, with the source shown; spatial information whose disclosure another law restricts follows that law's procedure [N1].
- The Institute's open API gives map tiles (WMTS) and search only, with a key. No vector data [N3].
- 건물높이 공간정보 is restricted: given for research, public welfare and safety after an official letter [N4]. Not a candidate.

## 5. 행정안전부: 도로명주소 건물 (`TL_SPBD_BULD`)

The building layer of the road name address map. Three routes lead to it.

### 5.1 business.juso.go.kr

- "도로명주소 전자지도" is listed under 제공하는 주소 (shapes and coordinates): 11 layers including buildings and building groups, by province or district, SHP, monthly [J1][J2].
- It is not a direct download. The applicant passes identity verification, fills in a form (purpose, reason, organisation or own name, system name, name, date of birth, phone, email, region) and waits for the approval of the head of the authority over the region [J2][J3][D4]. The decision is due in 10 days [L2].
- Before the download the applicant signs a handover confirmation and security pledge [J3]:
  - "이 자료는 국외로 반출할 수 없음".
  - No adding of non-public or restricted facilities, and no showing of their coordinates on the internet, navigation or mobile.
  - Follow 도로명주소법, 국가공간정보기본법 and the Ministry's security rules.
- The site refuses downloads of the electronic map from addresses outside Korea [J3].
- The law behind it: anyone who wants address information for a product or another use asks the Minister or the local head for it; the content may be cut or its use limited for national security; an address base map holding restricted information may not leave the country without the Minister's permission [L1].
- `TL_SPBD_BULD` has 30 fields [J2]: building serial number, district and road codes, main and sub building number, `BULD_NM` (the building register's name), `BUL_ENG_NM`, `BULD_NM_DC` (detailed building name), `POS_BUL_NM` (the district's own name for it), use code, floors above and below ground, lot number, dates, `BD_MGT_SN` (the earlier 25-digit building management number).
- A separate dataset, "도로명주소 건물 도형", is restricted further: a security review for spatial-information businesses, with a business registration, answered within 30 days and valid 2 years [J3]. Its fields are address keys only, with no name [J2].
- data.go.kr marks the electronic map 공공누리 type 1, free of charge, and repeats that it is given only after the application and review [D4].

### 5.2 VWorld download

- "도로명주소 건물", SHP by province, EPSG:5179. The Seoul file is 89 MB with base date 2026-09, renewed 2026-09-15 [V9]. Login needed.
- Licence on the page: CC BY-NC-ND. No commercial use, and use without change [V9].
- The sample lists `BULD_NM`, `BULD_NM_DC`, `POS_BUL_NM`, `ETC_BUL_NM`, `BUL_ENG_NM`, `GRO_FLO_CO`, `BD_MGT_SN` among 47 fields [V9].

### 5.3 VWorld Data API and WFS

- The Data API's list has one building layer, `LT_C_SPBD` [V1].
- `GET https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LT_C_SPBD&key=…&domain=…&geomFilter=BOX(minx,miny,maxx,maxy)` [V2].
  - Answer in GeoJSON, EPSG:4326 by default. At most 1,000 features a page. A box or polygon filter may cover at most 2 km² [V2]. The campus extent is about 3.0 km², so two boxes.
  - Fields: `bd_mgt_sn`, `buld_nm`, `bul_eng_nm`, `buld_nm_dc`, `gro_flo_co`, `sido`, `sigungu`, `gu`, `rd_nm`, `buld_no`, `ag_geom` [V2].
  - The layer was last renewed on 2026-09-10 [V2].
- WFS at `https://api.vworld.kr/req/wfs` has `lt_c_spbd` and `lt_c_bldginfo` (건축물정보) among 169 layers, at most 1,000 features a request [V3].
- data.go.kr lists the same API as 공공누리 type 1 with third-party rights marked [D7]. The key and the terms are VWorld's (§2).

### 5.4 Verdict

- My judgement: do not store this layer.
  - From VWorld's download, CC BY-NC-ND forbids sharing a changed copy; clipping to the campus and converting to GeoJSON is a change.
  - From business.juso.go.kr, the pledge forbids taking the data abroad, and a public GitHub repository is served from abroad.
  - From the API, article 19 of VWorld's terms forbids storing.

## 6. Seoul Open Data Plaza

- "서울시 건물 위치정보" (OA-13227) ended on 2021-07-16 and points to the road name address system's application. It was 공공누리 type 3 (no changes) [SE1].
- A search of the Plaza for 건물, 수치지도, 수치지형도 and 도형 found one dataset with building geometry behind it: "서울시 건물 태양에너지 등급도(2018년)" (OA-15944) [SE2].
  - Seoul's digital-map buildings with a predicted solar yield per roof. Published 2020-03-20, a one-off, the file dated 2020-09-23. 공공누리 type 1; "제3저작권자: 있음".
  - One ZIP, 161,084,882 bytes, downloaded without a login from the dataset page's own button.
  - Inside: one CSV in CP949, semicolon-separated, 1,029,872 records. Columns: 건물관리번호, 건물명, 층수, 건물높이, 건물면적, energy figures, and `x좌표`, `y좌표` in EPSG:5179.
  - It holds one point per record. No outline.
- No dataset of 관악구 with building shapes was found, on the Plaza or on data.go.kr.

## 7. What the Seoul file shows about the campus

Not an outline comparison. Points with a footprint area, from 2018, against the OpenStreetMap outlines exported on 2026-10-02.

- Inside the Campus Boundary with the 10 m margin: 670 records with 314,319 m² of footprint in total; 313 of them are 50 m² or more, 199 are 300 m² or more. OpenStreetMap has 207 outlines there with 312,800 m².
  - A large building is several records, one per roof part: 제1공학관 is two, of 2,249 and 1,067 m². Bicycle shelters and bus shelters are records too.
  - My judgement: by area the two cover about the same; the Seoul map splits it into more pieces, 313 of 50 m² or more against 207 outlines.
- Of the 199 records of 300 m² or more, 181 points lie inside an OpenStreetMap outline, 13 within 10 m, 5 farther.
  - The 5: `문화관` (3,153 m²), `통일평화연구원` (1,705 m²), `중앙도서관관정관` (886 m²), a site office (502 m²) and an unnamed one (420 m²).
  - 문화관 is building 73, one of the 14 campus-map points with no OpenStreetMap outline within 10 m.
  - The 관정관 point lies 19 m from OpenStreetMap's `관정도서관` outline, so a point outside an outline does not prove a missing building.
- 19 OpenStreetMap outlines (23,360 m²) hold no Seoul record, among them `수의과대학`, `유회진학술정보관 (300동)`, `우석경제관` and `데이터사이언스대학원`. My judgement: mostly buildings newer than 2018, and some points that fall outside their outline.
- 해동첨단공학관 (303동): the 2018 file has nothing larger than 407 m² within 60 m of 37.4505, 126.9517. It does not cover this gap.
- Names: 640 of the 670 records have one; 193 are only `서울대학교`. 24 records carry a `<number>동`, 13 distinct numbers, all among the project's 218 numbered buildings: eleven dormitory buildings (`관악사905동`), 125 and 14. For 12 of the 13 the record lies within 50 m of the building's point; the median distance over the 13 is 3.6 m.
  - So 13 of the 218 numbered buildings could be linked by name in this file. The rest would be matched by position.

## 8. May the project store them

| Source and route | Derived copy in a public repository | Shown in the app | Attribution |
|---|---|---|---|
| GIS건물통합정보, file | Yes | Yes | 국토교통부, the dataset's name and year, 공공누리 type 1, a link to the source |
| 연속수치지형도 건물, file | Yes | Yes | 국토지리정보원, the same form |
| 국가기본도 건물, file | Ask first; no licence stated | Ask first | — |
| 도로명주소 건물, any route | No | Only live from the API, with a key | — |
| Anything through VWorld's API | No, without prior consent | Yes, marked as made with VWorld | As VWorld sets |
| Seoul OA-15944 | Yes, subject to the third-party mark | Yes | 서울특별시, the same form |

- 공공누리 type 1 allows free use, commercial or not, and changed versions, on one condition: show the source. The model wording names the institution, the year, the type and the work, and says where it can be downloaded; online, link to the source site. The user must not suggest the institution sponsors them [KG1].
- CC BY on VWorld's pages asks the same: name the original author [V6][V8].
- An institution does not guarantee the accuracy of a 공공누리 work or that it stays available [KG1].
- My judgement: keep government polygons in a file of their own, beside the OpenStreetMap file and not merged into it.
  - The OpenStreetMap wiki holds that 공공누리 type 1 data cannot go into OpenStreetMap without the institution's explicit permission: the licence does not state that relicensing under ODbL is allowed [OW1].
  - A database derived from OpenStreetMap is shared under ODbL (`external-sources.md` §6.1). A file that mixes the two would carry both conditions; two files side by side keep each under its own.
- My judgement: the app then shows two attributions where both layers are drawn, OpenStreetMap's and the Ministry's.

## 9. The comparison

### 9.1 GIS건물통합정보

Run on 2026-10-03 on `AL_D010_11_20260909.zip`, GIS건물통합정보 for Seoul with base date 2026-09-09, which a person downloaded from VWorld after logging in [V6]. The file is kept outside the repository. Its `.dbf` reads as CP949, and its `.prj` is Korea 2000 Central Belt 2010, EPSG:5186.

| In the campus extent | OpenStreetMap | GIS건물통합정보 |
|---|---|---|
| Polygons | 225 | 533 |
| Of them under 30 m² | | 205 |
| Vertices, in all and the median of a polygon | 2,071 and 8 | 5,219 and 4 |
| Footprint area | 323,667 m² | 291,428 m² |
| Of the 218 numbered building points: inside an outline | 183 | 184 |
| Within 10 m of one | 21 | 16 |
| None within 10 m | 14 | 18 |

- Buildings one source draws and the other does not, among the 218:
  - Only OpenStreetMap, 14: 300 (유회진 학술정보관), 223 (우석경제관), 86 (치의학대학원 첨단교육연구복합단지), 81, 80-1, 64 (IBK커뮤니케이션센터), 71-1, 43-2, 15-1, 143, 129, 101, 100 and 51.
  - Only the government file, 10: 73 (문화관), 110, 115, 127-1, 128, 207, 52-2, 68-2, 104-2 and 104-3.
  - Neither: 56-1 (김철수물리관), 76-1, 85-1 and 99-1. 해동첨단공학관 (303동) is in neither file.
- The file is not as current as its base date. Every polygon's data date (`A22`) is September 2026, but the approval dates (`A13`) stop early:
  - Inside the Campus Boundary, 193 of 432 polygons have one, the newest 2013-11-15: 69 from the 2000s, 24 from 2010 to 2013, none later. 341 of the 432 stand on one parcel, 신림동 산 56-1.
  - In an ordinary neighbourhood beside the campus, around 서울대입구역 (37.476 to 37.484 north, 126.948 to 126.958 east), 2,056 of 2,345 polygons have one: 30 to 50 a year from 2014 to 2018, five in January 2019, the newest 2019-01-14, and none later.
  - My judgement: the shapes of this district were last brought up to date in early 2019, and the campus's were behind even then. No source read here says how often a district's shapes are renewed, or why the campus lags.
- Where both draw a building, 189 one-to-one pairs:
  - Intersection over union: median 0.69, 10th percentile 0.41.
  - Wall-to-wall distance, sampled every metre along both outlines: median 2.1 m and 90th percentile 7.4 m over all samples; a pair's own 90th percentile has a median of 5.2 m.
  - The government outline has 1.75 times the vertices of OpenStreetMap's, by the median of the pairs.
  - 34 OpenStreetMap outlines are drawn as two or more government polygons, and 14 the other way round.
- 제1공학관 (301동): 4,883 m² in OpenStreetMap, 2,862 m² in the government file. Laid over Kakao's map, OpenStreetMap's outline follows Kakao's drawing of the building, and the government's covers its western part only.
- Laid over Kakao's map in three areas (301동 and its neighbours, 중앙도서관 and its neighbours, the 500동 complex), both sources' walls lie on Kakao's drawing of the buildings, a metre or two apart from each other. That was judged by eye on screenshots, not measured, and Kakao's drawing was looked at, not stored.
- The names, `A24`: 155 of the 533 polygons have one, 142 of the form `관악 301동[신공학관1]`. 128 of the 218 building numbers appear in such a name, but for 37 of the 128 the named polygon lies more than 10 m from the campus map's point for that number, some of them over 1 km away. My judgement: the name does not link a polygon to a building reliably, and the link by position stays.
  - The script's own count, "points inside an outline whose text attributes contain the building number: 93 of 184", is not to be used: it also finds the number inside the parcel and identifier codes.

### 9.2 연속수치지형도 건물

Run on 2026-10-03 on the ten files of [V8], which a person downloaded from VWorld after logging in. The files are kept outside the repository.

- The files hold the layer `N3A_B0010000`: by the layer naming of the description that comes with them, the building layer of the 1:5,000 map. Each file holds 2.2 million records (the tenth 2.5 million), about 220 MB zipped and 1.9 GB unzipped, in EPSG:5179. The records are not grouped by province: file 009 holds the north of the capital region, and the campus's records are in file 001, at record numbers 993,587 to 1,166,167.
- Five of the ten downloads came cut off when all ten were started at once: the browser showed them as finished, but the ZIPs lack their end. Files 001 and 009 were downloaded again, one at a time, and are whole. What follows is from the whole file 001: 845 records in the campus extent, 834 of them polygons that reach it.
  - A ZIP's members are stored one after another, so a cut-off file still gives what had arrived. The cut-off file 001 gave the same 845 records with the same shapes.
  - By the legal-district code (`BJCD`) of every record, read from the attribute tables, which arrived whole: file 001 holds 48,514 buildings of 관악구, file 010 holds 504 and file 009 nine; files 006 and 008 hold none. File 010's 504 are bus shelters, street stalls and subway exits, with a handful on the campus, such as one labelled `제2공학관` and three labelled `서울대학교`. Their shapes are in the part of file 010 that did not arrive.

| In the campus extent | OpenStreetMap | 연속수치지형도 | GIS건물통합정보 |
|---|---|---|---|
| Polygons | 225 | 834 | 533 |
| Of them under 30 m² | | 416 | 205 |
| Footprint area | 323,667 m² | 350,879 m² | 291,428 m² |
| Of the 218 numbered building points: inside an outline | 183 | 198 | 184 |
| Within 10 m of one | 21 | 13 | 16 |
| None within 10 m | 14 | 7 | 18 |

- It is current: every polygon's production code (`FMTA`) starts with `R24`, and it draws 유회진 학술정보관 (300동), 우석경제관 (223동), 중앙도서관 관정관, 문화관 (73동), 글로벌공학교육센터 and 해동첨단공학관 (303동). My judgement: `R24` means a revision of 2024; the description does not define the code.
  - It draws nine of the numbered buildings that OpenStreetMap lacks: 73, 76-1, 85-1, 104-2, 104-3, 127-1, 128, 207 and 52-2. OpenStreetMap draws two that it lacks, 100 (버들골 풍산마당) and 117. Neither draws 김철수물리관 (56-1동). 배터리공동연구센터 is the polygon it labels `311관` (§9.3).
  - Only three OpenStreetMap outlines, 2,322 m², have no counterpart in it.
- The labels, `ANNO`: 368 of the 834 polygons have one, such as `151동미술관` and `공과대학38동글로벌공학교육센터`, and 201 of them hold a building number. 172 of the 218 numbers appear in a label, and for all 172 the labelled polygon lies at the campus map's point for that number, within 10 m. 46 numbers have no label, mostly stores, links between buildings and annexes such as 105-1.
  - Of the 198 points inside a polygon, the polygon's label holds the point's own number for 166, only another number for 9 (an annex inside its main building's outline, such as 59-1 in 59동's), and no number for 23.
  - `NAME` is `서울대학교` on 728 polygons and tells nothing.
- How far the outlines of one building differ, as the median over the pairs of a pair's median and of its 90th percentile wall-to-wall distance:

| Pair of sources | Pairs | Intersection over union | Median | 90th percentile |
|---|---|---|---|---|
| OpenStreetMap and 연속수치지형도 | 208 | 0.70 | 2.0 m | 5.0 m |
| OpenStreetMap and GIS건물통합정보 | 189 | 0.69 | 2.1 m | 5.2 m |
| 연속수치지형도 and GIS건물통합정보 | 327 | 0.89 | 0.3 m | 0.6 m |

- The two government files draw the same shapes, GIS건물통합정보 being an older state of them, so their agreement alone does not show that OpenStreetMap is the one that is off. §9.3 does.

### 9.3 The differences, checked by a person against Kakao's map

On 2026-10-03 a person went through the differences between OpenStreetMap and 연속수치지형도 one by one, with both sets of outlines laid over Kakao's map of the campus, and judged each against Kakao's drawing of the buildings. Kakao's map was looked at, not stored. The person's overall reading: 연속수치지형도 lies closer to Kakao's map than OpenStreetMap does.

What the layer classes each polygon as (`KIND`) settles most of the small ones first:

- Of the 834 polygons, 356 are buildings (`BDK004`, 주택외건물), 455 are wall-less structures (`BDK005`, 무벽건물: canopies, shelters, covered walks), 20 are temporary buildings, two are greenhouses and one is under construction. The person's decision: the small structures can all go.
- With the 356 buildings alone, 192 of the 218 numbered building points lie inside an outline, 17 within 10 m and 9 farther; the wall-less structures had carried six more points, among them two links between buildings and 종합운동장본부석.

Outlines of both sources that are of one building but overlap by less than half, 28 pairs:

| Verdict | Pairs | Which |
|---|---|---|
| 연속수치지형도 is right | 22 | 62-1 (관정관), 32, 302, 59 (LG경영관), 42, 52, 49, 945, 15-1, 941-1, 54, 16-1, 141, 30-2, 지진관측소, the dormitories 901, 919C, 921, 922, 923 and 924, and 교수아파트 F동 |
| OpenStreetMap is right | 2 | 300 (유회진 학술정보관) and 919A |
| Both about the same | 2 | 16 (사회과학관) and 17 |
| Not judged | 2 | 925, and a pair without a name that the person calls unneeded |

- The dormitories and the faculty apartments are where OpenStreetMap is off as a group: the outlines have the buildings' sizes but lie some metres aside.

Outlines of 150 m² or more that only 연속수치지형도 has, 27:

- Real and wanted, 12: 문화관 (73동, two polygons), 해동첨단공학관, 주차타워 (76-1), 105-2 (labelled `105동유전자공학연구소서관`), the polygon labelled `311관`, which is 배터리공동연구센터, a wall-less polygon of 198 m² at the points of 207 and 52-2, and outside the Campus Boundary 교수아파트 G동, H동 and I동, 방가로3 and 위험물저장고.
  - 교수아파트 G, H and I and 위험물저장고 are in OpenStreetMap too, but so far aside that the outlines do not meet.
- Not wanted, 12: the three polygons of 서울교육청과학전시관 outside the Boundary; 자연과학대학26동기초과학실험교육동, where OpenStreetMap's shape fits better; five polygons without a label that the layer classes as buildings, of 953, 887 (beside 관정관), 166, 161 and 159 m²; and three wall-less ones.
- Not judged, 3: a polygon of 403 m² at the point of 80-1, `서울대학교아파트` of 323 m², and `331동`.

Outlines that only OpenStreetMap has, 8:

- Real and wanted, 2: 버들골 풍산마당 (100동) and 데이터사이언스대학원 (43-2동).
- Not wanted, 2: 한국경제혁신센터, of 1,569 m², which by Kakao's map is not there, and 저류조 입구.
- The other four are 교수아파트 G, H and I and 위험물저장고, misplaced as said above.

What was decided for a change to 연속수치지형도, on 2026-10-03:

- The outlines come from 연속수치지형도, from the polygons it classes as buildings. The wall-less structures, the temporary buildings and the greenhouses are left out.
- A building may have several outlines: every polygon whose label names its number is the building's. Ten of the numbered buildings are drawn as two to five polygons, such as 사회과학관 (16동) as five and 문화관 (73동) as two.
- A building is linked to its outlines by the number in the label; without one, by the polygon that holds its point; without that, by a polygon within 10 m that no building has. Tried on the data: 172, 25 and 5 of the 218, so 202 have an outline before the corrections, against 194 from OpenStreetMap today.
- OpenStreetMap's outlines are used only where the corrections file names one, for three buildings: 버들골 풍산마당 (100동, `way/193893586`) and 데이터사이언스대학원 (43-2동, `way/1485386282`), which 연속수치지형도 does not draw, and 종합운동장본부석 (149동), which it draws only as a wall-less structure. 300동 and 26동 take 연속수치지형도's outlines. The OpenStreetMap seed file then holds only the outlines the corrections name.
- 화학관연결동 (253동) has no outline: its point lies in an unlabelled polygon that is not wanted.
- 반도체교육관 (104-1동) keeps its own polygon alone: the layer labels a second polygon `104-1동국제대학원`, which stands at 국제대학원, about 1 km away. The count of 172 above takes a number as found when any polygon labelled with it lies at the building's point, so it did not show this.
- Left without an outline, about 14: 김철수물리관 (56-1동), 정문수위실, three links between buildings, and stores.
- Not decided: whether the change is made in the pull request that brought the outlines or as a ticket of its own.

### 9.4 Repeating it

The OpenStreetMap side, computed by the script:

- 225 polygons in the campus extent, 2,071 vertices, a median of 8 a polygon, 323,667 m².
- Of the 218 numbered building points inside the Campus Boundary (10 m margin), 183 lie inside an outline, 21 within 10 m, 14 have none within 10 m. The 218 are the campus map's 216 and the two from `openstreetmap-buildings.json`.

The shortest path for a person:

1. Sign up at `https://www.vworld.kr` (terms, identity verification) and log in.
2. Open GIS건물통합정보 under 공간정보 다운로드 [V6]. Set 시·도 to 서울특별시 and 구분 to 전체데이터, press 조회, and download the newest SHP (129 MB).
3. Unzip it into the scratchpad folder and run:

   ```sh
   cd /private/tmp/claude-501/-Users-fyoon-Developments-IdeaProjects-swpp-2026-project-team-09/baab0fb0-2ba5-405a-9fc5-c1eb50747dff/scratchpad/public-buildings
   ./venv/bin/python compare_outlines.py --gov <path>.shp --crs EPSG:5186 --label GIS건물통합정보
   ```

- Input the script accepts: a `.shp` with its `.dbf` and `.shx`, a GeoJSON FeatureCollection of polygons, or a saved VWorld Data API answer. `--crs` is required for a shapefile: EPSG:5186 for GIS건물통합정보, EPSG:5179 for the 국토지리정보원 layers. `--encoding` is the `.dbf`'s, CP949 by default; pass `utf-8` if names come out garbled. A whole-city file is fine; everything outside the campus extent is skipped.
- What it prints, for OpenStreetMap and the given file:
  - Polygons in the extent, total vertices, vertices per polygon, total area.
  - The 218 points: inside an outline, within 10 m, none; and which points one source covers and the other does not.
  - Outlines present in both: one-to-one pairs (each the other's largest overlap, covering at least half of the smaller), their intersection over union, and the wall-to-wall distance sampled every 1 m along both outlines, as median and 90th percentile.
  - Outlines of one source that two or more of the other overlap, and outlines with no counterpart.
  - Around the three known gaps (303동 and 배터리공동연구센터, the 500동 complex, 301동): the outlines of each source with area, vertices and name.
  - The file's attributes with fill counts, and for how many points the containing polygon's text holds the building number.
- The script was checked against the OpenStreetMap file itself (225 pairs, IoU 1.000, 0 m) and against a copy shifted 2 m east with every tenth outline removed, as GeoJSON in EPSG:5179 and as a CP949 shapefile in EPSG:5186 (200 pairs, median IoU 0.837, 90th percentile distance 1.99 m).
- Also in the folder: `seoul_points_vs_osm.py`, which produced §7; the downloaded Seoul ZIP and CSV under `data/`; the fetched pages under `pages/`. Nothing from it is in the repository.

## 10. Unverified

- Which source is right where the outlines differ by only a few metres. The person's check covers the 28 pairs that overlap by less than half and the outlines that one source alone has; the other 176 pairs were looked over but not judged one by one.
- The shapes of file 010's handful of campus records of 연속수치지형도 건물, by their labels shelters and the like. What `FMTA` means, and the positional accuracy the 1:5,000 map is made to.
- Why the government file holds no building approved after January 2019 beside the campus and none after 2013 on it, whether that holds for the rest of Seoul, and whether its 301동 is an older state of the building.
- Whether the road name address layer's `BULD_NM_DC` names the campus's buildings better than `A24` does (§9). The whole campus has one street address (`external-sources.md` §6.1), so a building number can come only from a name.
- The attribute list of the 국토지리정보원's building layers. The table definitions are behind the login.
- Whether 문화관 (building 73) still stands. Seoul's 2018 file has it; OpenStreetMap has no outline there.
- Whether VWorld would consent to storing API results, and the daily call limit of a development key. The WFS page shows 999,999,999 a day for its one operation [V11].
- Whether clipping and reformatting counts as a change under the CC BY-NC-ND mark on VWorld's road name address download. Read here as a change.
- Not checked: Statistics Korea's SGIS, Seoul's S-Map, and the building register's own open data (건축데이터 민간개방, no shapes expected).

## 11. Sources (accessed 2026-10-03)

[V1]: https://www.vworld.kr/dev/v4dv_2ddataguide2_s001.do
[V2]: https://www.vworld.kr/dev/v4dv_2ddataguide2_s002.do?svcIde=spbd
[V3]: https://www.vworld.kr/dev/v4dv_wmsguide2_s001.do
[V4]: https://www.vworld.kr/v4po_prcint_a001.do
[V5]: https://www.vworld.kr/v4po_prcint_a006.do
[V6]: https://www.vworld.kr/dtmk/dtmk_ntads_s002.do?svcCde=NA&dsId=18
[V7]: https://www.vworld.kr/contents/%EA%B5%AD%EA%B0%80%EC%A4%91%EC%A0%90%EB%8D%B0%EC%9D%B4%ED%84%B0_%EC%BB%AC%EB%9F%BC%EC%A0%95%EC%9D%98%EC%84%9C%2826.08.19%29_%EB%B0%B0%ED%8F%AC%EC%9A%A9.xlsx
[V8]: https://www.vworld.kr/dtmk/dtmk_ntads_s002.do?dsId=30162
[V9]: https://www.vworld.kr/dtmk/dtmk_ntads_s002.do?svcCde=MK&dsId=30056
[V10]: https://www.vworld.kr/dtmk/dtmk_ntads_s002.do?svcCde=MK&dsId=20250121DS00011
[V11]: https://www.vworld.kr/dtna/dtna_apiSvcFc_s001.do?apiNum=76
[V12]: https://www.vworld.kr/v4po_usrcla_a002.do
[D1]: https://www.data.go.kr/data/15083092/fileData.do
[D2]: https://www.data.go.kr/data/15052097/fileData.do
[D3]: https://www.data.go.kr/data/15125047/fileData.do
[D4]: https://www.data.go.kr/data/15050413/fileData.do
[D5]: https://www.data.go.kr/data/15059719/fileData.do
[D6]: https://www.data.go.kr/data/15123970/openapi.do
[D7]: https://www.data.go.kr/data/15059078/openapi.do
[J1]: https://business.juso.go.kr/jst/jstAddressDetailsSearch
[J2]: https://business.juso.go.kr/jst/jstAddressDownload
[J3]: https://business.juso.go.kr/jsm/JsmAddressInfoAplyWrite (the form and the pledge at `/jsm/jsmAplyConfirmAgree`, read from the site's page scripts without applying)
[L1]: https://www.law.go.kr/LSW/lsLinkProc.do?lsNm=도로명주소법&joNo=002500000&mode=2&lsClsCd=010202
[L2]: https://www.law.go.kr/LSW/lsLinkProc.do?lsNm=도로명주소법+시행령&joNo=004600000&mode=2&lsClsCd=010202
[N1]: https://www.ngii.go.kr/kor/content.do?sq=261
[N2]: https://map.ngii.go.kr/mi/oprGuide/mapPurchsGuide.do
[N3]: https://map.ngii.go.kr/mi/openKey/openKeyInfo.do
[N4]: https://map.ngii.go.kr/bl/map/buldEncView.do
[SE1]: https://data.seoul.go.kr/dataList/OA-13227/S/1/datasetView.do
[SE2]: https://data.seoul.go.kr/dataList/OA-15944/S/1/datasetView.do
[KG1]: https://www.kogl.or.kr/info/licenseType1.do
[OW1]: https://wiki.openstreetmap.org/wiki/Korea_Open_Government_License
