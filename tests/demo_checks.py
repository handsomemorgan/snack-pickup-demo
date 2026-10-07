import urllib.request,urllib.error,json,uuid,time,concurrent.futures
from pathlib import Path
BASE='http://127.0.0.1:5173/api/snack';secrets={}
for line in Path(__file__).resolve().parents[1].joinpath('.env.local').read_text().splitlines():
 if '=' in line:k,v=line.split('=',1);secrets[k]=v
checks=[]
def call(view='',body=None,key='',token=''):
 h={'Content-Type':'application/json'}
 if key:h['x-admin-key']=key
 if token:h['x-order-token']=token
 req=urllib.request.Request(BASE+('?' + view if view else ''),headers=h,data=json.dumps(body).encode() if body else None)
 try:
  with urllib.request.urlopen(req,timeout=40) as r:return r.status,json.loads(r.read())
 except urllib.error.HTTPError as e:return e.code,json.loads(e.read())
def verify(name,condition):
 if not condition:raise AssertionError(name)
 checks.append(name);print('PASS',name)
def service(payload):return call(body={'action':'service','payload':payload},key=secrets['SERVICE_ADMIN_KEY'])
def merchant(payload):return call(body={'action':'order_action','payload':payload},key=secrets['MERCHANT_ADMIN_KEY'])
def payload(slot,quantity=1):return {'action':'order','payload':{'idempotencyKey':str(uuid.uuid4()),'accessToken':str(uuid.uuid4()),'items':[{'id':'p9','quantity':quantity,'expectedPrice':1100}],'pickupAt':slot,'spice':'微辣','note':'测试 不要香菜','alias':'演示测试'}}
status,catalog=call();verify('menu seeded with 26 main dishes and 9 extras',status==200 and len(catalog['products'])==35)
verify('unauthorized merchant writes rejected',call(body={'action':'product','payload':{}},key='bad')[0]==401)
verify('service key cannot access merchant actions',call('view=merchant',key=secrets['SERVICE_ADMIN_KEY'])[0]==401)
_,s=service({'action':'issue'});verify('monthly signed License issuance',s['license']['valid'] and s.get('issuedLicense'))
old=s['issuedLicense'];parts=old.split('.');bad=parts[0]+'.'+('x'+parts[1][1:]);verify('tampered License rejected',call(body={'action':'activate','payload':{'license':bad}},key=secrets['MERCHANT_ADMIN_KEY'])[0]==400)
_,catalog=call();slot=catalog['slots'][2]['at'];b=payload(slot);st,o=call(body=b);verify('reservation saved with unpaid simulated receipt',st==200 and o['payment_state']=='unconfirmed' and o['print']['status']=='demo_printed')
st,again=call(body=b);verify('repeated request returns same order',st==200 and again['id']==o['id'])
verify('wrong order token cannot read order',call('view=order&id='+o['id'],token='bad')[0]==404)
_,m=call('view=merchant',key=secrets['MERCHANT_ADMIN_KEY']);verify('one print job per repeated order',sum(1 for x in m['orders'] if x['id']==o['id'])==1 and m['orders'][0]['print']['attempts']==1)
service({'action':'expire'});verify('expired License rejects new orders',call(body=payload(slot))[0]==403)
verify('retry of already accepted order still works after expiry',call(body=b)[0]==200)
verify('existing order confirms payment after License expiry',merchant({'id':o['id'],'action':'confirm_payment'})[0]==200)
verify('existing order marks ready after License expiry',merchant({'id':o['id'],'action':'ready'})[0]==200)
verify('existing order pickup after License expiry',merchant({'id':o['id'],'action':'picked_up'})[0]==200)
service({'action':'issue'});service({'action':'suspend'});verify('current license cannot bypass administrative suspension',call(body={'action':'activate','payload':{'license':old}},key=secrets['MERCHANT_ADMIN_KEY'])[0]==403);service({'action':'resume'})
_,m=call('view=merchant',key=secrets['MERCHANT_ADMIN_KEY']);p=next(x for x in m['products'] if x['id']=='p9')
p2={**p,'active':False};st,_=call(body={'action':'product','payload':p2},key=secrets['MERCHANT_ADMIN_KEY']);_,c=call();verify('merchant unlisting synchronizes to customer',st==200 and not any(x['id']=='p9' for x in c['products']))
call(body={'action':'product','payload':{**p,'active':True,'price':1200}},key=secrets['MERCHANT_ADMIN_KEY']);verify('stale-price order rejected',call(body=payload(c['slots'][3]['at']))[0]==409)
_,prior=call('view=order&id='+o['id'],token=b['payload']['accessToken']);verify('old order retains original price snapshot',prior['total']==1100)
call(body={'action':'product','payload':{**p,'active':True}},key=secrets['MERCHANT_ADMIN_KEY'])
service({'action':'printer','online':False});_,c=call();b2=payload(c['slots'][4]['at']);_,o2=call(body=b2);verify('offline printer preserves queued task',o2['print']['status']=='queued');service({'action':'printer','online':True});_,o2=call('view=order&id='+o2['id'],token=b2['payload']['accessToken']);verify('printer recovery processes queued task',o2['print']['status']=='demo_printed')
_,c=call();slot2=c['slots'][7]['at'];service({'action':'capacity','capacity':1});bs=[payload(slot2),payload(slot2)]
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(lambda x:call(body=x),bs))
verify('concurrent last-slot reservation does not overbook',sorted(x[0] for x in results)==[200,409])
service({'action':'capacity','capacity':6})
# Release all test reservations and keep demo ready for the owner.
_,m=call('view=merchant',key=secrets['MERCHANT_ADMIN_KEY'])
for item in m['orders']:
 if item['status']=='reserved' and item['alias']=='演示测试':merchant({'id':item['id'],'action':'cancel'})
Path(__file__).with_name('validation-report.json').write_text(json.dumps({'passed':checks,'count':len(checks)},ensure_ascii=False,indent=2))
print('ALL',len(checks),'checks passed')
