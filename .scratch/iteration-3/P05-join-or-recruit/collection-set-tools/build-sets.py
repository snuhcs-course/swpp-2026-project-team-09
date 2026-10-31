################################################################################
# AI-generated with Claude
#
# 2026-10-31  Opus 5.5   prompted by Jaehyun0320
################################################################################

# Writes the sets and blank label files of evaluations A and B from the saved pool. Answers are never written: only what
# was chosen, why, and blanks.
import json,os,random,shutil,sys,uuid,re,collections
POOL,OUT=sys.argv[1],sys.argv[2]
d={x['key']:x for x in json.load(open(f'{POOL}/analysis.json'))}
man={}
for l in open(f'{POOL}/manifest.jsonl'):
    m=json.loads(l)
    if 'fetchedAt' in m and 'skipped' not in m: man[m['key']]=m
def pid(k): return ('extra-' if k.startswith('PGM') else 'snu-')+k
P=lambda n: 'PGM01200'+str(n) if len(str(n))==4 else str(n)
DEV_A=['177848','177863','177869','177890','177902','177908','177926','177929','177932','177992','178022','178028','176516','176525','176549','176558','176561','176564']
A={ # post: why it was chosen
 'no-event':['178244','178082','177752',2298,2199,2238],
 'application-period-only':['177476','177506','177326',2403,2245],
 'image-only':['177458','177476','177506',2313],
 'multi-session':['177470','178016','178130','177509','178250',2304,2362,2261],
 'year-left-out':['177407','177650','177659','177755','178010','178247','177773','178145'],
 'building-number-alone':['177989','178424','177767','178250',2406,2294,2347,2375,2387,2331,1974,2367],
 'over-a-period':['177326','178235','177662','177524','177590','178025',2199,2238,2385,2415,2413,2198,2369],
 'elsewhere':['177995','178067'],
 'online':['178349','178454',2411,2197,2261],
}
A_EXTRA=[2395,'177653','178013','177320']  # chosen for another reason than a tag: no date line, or a time at midnight
tags=collections.defaultdict(list)
for t,ks in A.items():
    for k in ks: tags[P(k)].append(t)
for k in A_EXTRA: tags.setdefault(P(k),[])
held=list(tags); snu=[k for k in held if not k.startswith('PGM')]; ex=[k for k in held if k.startswith('PGM')]
print('A held-out',len(held),'snu',len(snu),'extra',len(ex))
for k in held:
    if all(s['rulesPublish'] for s in d[k]['sessions']): print('!! rules publish every session of',k,d[k]['title'])
    if k in DEV_A: print('!! in dev',k)
print('A sessions by page (SNU counted 1 each)',sum(len(d[k]['sessions']) for k in held))
pos=[]
def add(kind,a,b,sa=None,sb=None,trap=False,cluster=None): pos.append(dict(kind=kind,a=P(a),b=P(b),sa=sa,sb=sb,trap=trap,cluster=cluster or P(a)))
for a,b in [('178079',2382),('177707',2381),('177392',2266)]: add('body-link',a,b)
for a,b in [('178226',2414),('178064',2395),('178013',2403),('177311',2305),('177863',2376),('178223',2404),('177329',2319),('177848',2396),('177458',2264),('177119',2311),('177026',2309),(2073,2138),(2074,2139),(2068,2127),(2075,2234),(2076,2137),(2071,2091)]: add('different-title',a,b)
for a,s in [('176978',4),('177314',5),('177920',6)]: add('many-to-one',a,1958,sb=s,cluster='shine')
for b in [2389,2390,2391,2392,2393,2394]:
    add('many-to-one','177764',b,cluster='health'); add('many-to-one','178085',b,cluster='health')
for b in [1882,2398,2397]: add('many-to-one','178016',b)
for b in [2211,2307,2415]: add('many-to-one','177017',b)
for b in [2327,2329,2330]: add('many-to-one','177542',b)
neg=[]
def n(kind,a,b,sa=None,sb=None,trap=False): neg.append(dict(kind=kind,a=P(a),b=P(b),sa=sa,sb=sb,trap=trap))
n('in-person-or-online','177707',2382,trap=True)
for a,b in [('178079',2381),(1974,1975),(1976,1977),(2144,2146),(2381,2382),('177707',2144),('178079',2146)]: n('in-person-or-online',a,b)
for a,b in [(2174,2175),(2175,2176),(2176,2177),(2177,2179),(2331,2332),(2332,2333),(2333,2334),(2334,2335),(2354,2355),(2355,2356),(2356,2357),(2357,2358),(2363,2364),(2364,2365),(2367,2368),(2244,2305),(2184,2130),('177311',2244),('177311',2184),(2277,2309),('177026',2277),(1882,2398),(2398,2397),('177317',2398),('177317',1882),('177881','178217'),('177323','177668'),(2411,2412),(2390,2393),(2391,2394),(2389,2392),(2315,2317),(2322,2326),('176978',1976),(2082,2084),(2084,2088),(2088,2090),(2142,2303)]: n('another-round',a,b)
n('another-round','177314',1958,sb=6); n('another-round','177920',1958,sb=5)
for a,b,sa,sb in [(2145,'176918',3,None),(2195,'176924',None,None),(2205,'177113',2,None),(2270,'177656',None,None),(2271,'177626',None,None),('177626','177692',None,None),(2349,'177533',None,None),(2272,'176972',None,None),('177122','177131',None,None),('177689','177824',None,None),('177035','178022',None,None),('177035','177809',None,None),('177587','177887',None,None),('178346','178349',None,None),('177473','178097',None,None),('178250','178328',None,None),(2331,2347,None,None),(2347,'178427',None,None),('177821','178103',None,None),(2390,'177902',None,None),(2393,'177710',None,None),(2377,'178064',None,None),(2378,'178205',None,None),(2406,'178151',None,None),(2328,'178136',None,None),(2332,'177869',None,None),(2304,2322,3,None),('177893',2322,None,None)]:
    n('same-time-another-event',a,b,sa,sb)
print('B positives',len(pos),'negatives',len(neg),collections.Counter(x['kind'] for x in pos+neg))
for x in pos+neg:
    for k in (x['a'],x['b']):
        if k not in d or k not in man: print('!! missing',k)
keys=[tuple(sorted([x['a'],x['b']]))+(x['sa'],x['sb']) for x in pos+neg]
for k,c in collections.Counter(keys).items():
    if c>1: print('!! dup',k)
rng=random.Random(20261031)
# About 20% to development, by groups of pairs joined through a shared post, so that no post is in both parts of B. A
# group touching a held-out post of A, or the trap, stays held out.
pairs=pos+neg
parent={}
def find(x):
    parent.setdefault(x,x)
    while parent[x]!=x: parent[x]=parent[parent[x]]; x=parent[x]
    return x
for x in pairs: parent[find(x['a'])]=find(x['b'])
groups=collections.defaultdict(list)
for x in pairs: groups[find(x['a'])].append(x)
heldA=set(held)
free=[g for g in sorted(groups,key=str) if not any(x['trap'] or x['a'] in heldA or x['b'] in heldA for x in groups[g])]
print('groups',len(groups),'free',len(free),'free pairs',sum(len(groups[g]) for g in free),sorted(len(groups[g]) for g in groups)[-5:])
rng.shuffle(free)
dev=[]
for g in free:
    if len(dev)+len(groups[g])<=30: dev+=groups[g]
    if len(dev)>=24: break
for x in dev: x['part']='development'
for x in pairs: x.setdefault('part','held-out')
rng.shuffle(pairs)
for i,x in enumerate(pairs,1):
    x['id']=f'b-{i:03d}'
    if rng.random()<.5: x['a'],x['b'],x['sa'],x['sb']=x['b'],x['a'],x['sb'],x['sa']
print('B parts',collections.Counter((x['part'],x['kind']) for x in pairs))
print('dev',sum(x['part']=='development' for x in pairs),'dev positives',sum(x['part']=='development' and x['kind'] in ('body-link','different-title','many-to-one') for x in pairs))
# Second labeller, hard negatives held out: the spec's 30, all kinds.
hn=[x for x in pairs if x['part']=='held-out' and x['kind'] in ('in-person-or-online','another-round','same-time-another-event')]
sec=[]
for kind,c in [('in-person-or-online',4),('another-round',14),('same-time-another-event',12)]:
    xs=[x for x in hn if x['kind']==kind]; rng.shuffle(xs); xs.sort(key=lambda x:not x['trap']); sec+=xs[:c]
rng.shuffle(sec)
print('second B',len(sec))
# A: ids over dev and held-out shuffled, so that an id says nothing.
items=[dict(post=k,part='development',tags=[]) for k in DEV_A]+[dict(post=k,part='held-out',tags=sorted(set(tags[k]))) for k in held]
rng.shuffle(items)
for i,x in enumerate(items,1): x['id']=f'a-{i:03d}'
ha=[x for x in items if x['part']=='held-out']
# 15 of A: every tag held by at least one, 9 SNU Now and 6 extra.snu.
sa=[]
for pred,c in [(lambda x:not x['post'].startswith('PGM'),9),(lambda x:x['post'].startswith('PGM'),6)]:
    xs=[x for x in ha if pred(x)]; rng.shuffle(xs); pick=[]
    for t in A:
        if len(pick)<c:
            for x in xs:
                if t in x['tags'] and x not in pick: pick.append(x); break
    for x in xs:
        if len(pick)<c and x not in pick: pick.append(x)
    sa+=pick
rng.shuffle(sa)
print('second A',len(sa),sorted({t for x in sa for t in x['tags']}))
os.makedirs(f'{OUT}/posts',exist_ok=True); os.makedirs(f'{OUT}/labels',exist_ok=True)
used=sorted({x['post'] for x in items}|{k for p in pairs for k in (p['a'],p['b'])})
for f in os.listdir(f'{OUT}/posts'): os.remove(f'{OUT}/posts/{f}')
J=lambda v: json.dumps(v,ensure_ascii=False)
size=0
with open(f'{OUT}/posts.yaml','w',encoding='utf8') as o:
    o.write('################################################################################\n# AI-generated with Claude\n#\n# 2026-10-31  Opus 5.5   prompted by Jaehyun0320\n################################################################################\n\n# Every saved post of the sets, and when it was fetched. The HTML is in posts/, under the name in `post`.\n')
    for k in used:
        shutil.copy(f'{POOL}/raw/{pid(k)}.html',f'{OUT}/posts/{pid(k)}.html'); size+=os.path.getsize(f'{OUT}/posts/{pid(k)}.html')
        m=man[k]; src='extra_snu' if k.startswith('PGM') else 'snu_events'
        o.write(f"- post: {pid(k)}\n  source: {src}\n  key: {J(k)}\n  url: {J(m['url'])}\n  fetchedAt: {J(m['fetchedAt'])}\n")
print('posts',len(used),'MB',round(size/1e6,1))
with open(f'{OUT}/set-a.yaml','w',encoding='utf8') as o:
    o.write('################################################################################\n# AI-generated with Claude\n#\n# 2026-10-31  Opus 5.5   prompted by Jaehyun0320\n################################################################################\n\n# Evaluation A: why each post was chosen, not its answer. The answers are in labels/.\n')
    for x in sorted(items,key=lambda x:x['id']):
        o.write(f"- id: {x['id']}\n  post: {pid(x['post'])}\n  part: {x['part']}\n  tags: {J(x['tags'])}\n")
with open(f'{OUT}/set-b.yaml','w',encoding='utf8') as o:
    o.write('################################################################################\n# AI-generated with Claude\n#\n# 2026-10-31  Opus 5.5   prompted by Jaehyun0320\n################################################################################\n\n# Evaluation B: why each pair was chosen, not its answer. `chosenAs` is what a pair was expected to be when it was\n# chosen; the answers are in labels/. Second labellers do not see this file.\n')
    for x in sorted(pairs,key=lambda x:x['id']):
        o.write(f"- id: {x['id']}\n  a:\n    post: {pid(x['a'])}\n    session: {J(x['sa'])}\n  b:\n    post: {pid(x['b'])}\n    session: {J(x['sb'])}\n  part: {x['part']}\n  chosenAs: {x['kind']}\n  trap: {J(x['trap'])}\n")
def labels_a(path,its,head):
    with open(path,'w',encoding='utf8') as o:
        o.write(head+'labeller: null\nlabelledOn: null\nitems:\n')
        for x in sorted(its,key=lambda x:x['id']):
            k=x['post']; a=d[k]; rows=max(1,len(a['sessions'])) if k.startswith('PGM') else 1
            o.write(f"  - id: {x['id']}\n    title: {J(a['title'])}\n    url: {J(man[k]['url'])}\n    file: posts/{pid(k)}.html\n    announcesEvent: null\n    sessions:\n")
            for n_ in range(1,rows+1):
                o.write(f"      - n: {n_}\n        start: null\n        end: null\n        place: null\n        overPeriod: null\n        mayPublish: null\n")
            o.write('    note: null\n')
def labels_b(path,its,head):
    with open(path,'w',encoding='utf8') as o:
        o.write(head+'labeller: null\nlabelledOn: null\nitems:\n')
        for x in sorted(its,key=lambda x:x['id']):
            o.write(f"  - id: {x['id']}\n")
            for side,k,s in (('a',x['a'],x['sa']),('b',x['b'],x['sb'])):
                o.write(f"    {side}:\n      title: {J(d[k]['title'])}\n      url: {J(man[k]['url'])}\n      file: posts/{pid(k)}.html\n      session: {J(s)}\n")
            o.write('    sameEvent: null\n    note: null\n')
HA='# 평가 A 라벨. 방법은 labels/GUIDE.md. null을 채운다. 회차 칸은 빈칸일 뿐 정답이 아니다. 회차를 더하거나 지워도 된다.\n'
HB='# 평가 B 라벨. 방법은 labels/GUIDE.md. sameEvent의 null을 true나 false로 채운다.\n'
labels_a(f'{OUT}/labels/a.owner.yaml',items,HA)
labels_a(f'{OUT}/labels/a.second.yaml',sa,HA)
labels_b(f'{OUT}/labels/b.owner.yaml',pairs,HB)
labels_b(f'{OUT}/labels/b.second.yaml',sec,HB)
NS=uuid.UUID('f0a41c01-89fc-436e-89a8-4fed1b7da405')
pl=json.load(open(f'{POOL}/places.json'))
seen=collections.Counter()
rows=[]
for p in pl:
    label=(p['number']+' ' if p['number'] else '')+p['name']; seen[label]+=1
    rows.append((label,p['number'] or '',p['name'],str(uuid.uuid5(NS,p['id']))))
if any(c>1 for c in seen.values()): print('!! dup place label',[l for l,c in seen.items() if c>1])
rows.sort(key=lambda r:(len(r[1])==0,[int(t) for t in re.findall(r'\d+',r[1])],r[2]))
with open(f'{OUT}/labels/places.tsv','w',encoding='utf8') as o:
    o.write('label\tnumber\tname\tid\n')
    for r in rows: o.write('\t'.join(r)+'\n')
