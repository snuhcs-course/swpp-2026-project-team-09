################################################################################
# AI-generated with Claude
#
# 2026-10-31  Opus 5.5   prompted by Jaehyun0320
################################################################################

import json,sys,re,collections
d=json.load(open(sys.argv[1]+'/analysis.json'))
snu=[x for x in d if x['source']=='snu']; ex=[x for x in d if x['source']=='extra']
def norm(t): return re.sub(r'[\s\W_]+','',re.sub(r'\[[^\]]*\]|2026학년도|2026|26년|2학기','',t)).lower()
def bg(t): t=norm(t); return {t[i:i+2] for i in range(len(t)-1)}
def day(s): return (s or '')[:10]
c=[]
for s in snu:
  a=bg(s['title'])
  # dates named in the body (M월 D일 / M.D / M/D)
  body=s['title']+' '+s['body']
  ds=set()
  for m in re.finditer(r'(\d{1,2})\s*월\s*(\d{1,2})\s*일|(?<!\d)(\d{1,2})\s*[./]\s*(\d{1,2})(?!\d)',body):
    g=[x for x in m.groups() if x]; 
    try: ds.add('%02d-%02d'%(int(g[0]),int(g[1])))
    except: pass
  for e in ex:
    b=bg(e['title']); j=len(a&b)/max(1,len(a|b))
    edays={day(ss['start'])[5:] for ss in e['sessions'] if ss['start']}
    bodyday=bool(edays&ds)
    shared=len(a&b)
    link=e['key'] in s['links']
    # title of extra appears in the post's body
    et=norm(e['title']); inbody=any(et[i:i+8] in norm(body) for i in range(max(0,len(et)-8)))
    if link or j>=.3 or (bodyday and (j>=.12 or inbody)) :
      c.append((link,round(j,2),bodyday,inbody,s['key'],e['key'],s['title'][:42],e['title'][:48],(e['sessions'][0]['start'] or '')[:16] if e['sessions'] else '',len(e['sessions'])))
c.sort(key=lambda r:(-r[0],-r[2],-r[1]))
print(len(snu),len(ex),'cands',len(c))
for r in c: print(r)
