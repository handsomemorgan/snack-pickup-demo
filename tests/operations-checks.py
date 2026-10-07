"""Local demo integration checks. Creates two disposable, simulated test tenants.
Never connect this test to a commercial deployment. Does not print any secrets.
"""
import urllib.request,urllib.error,json,uuid
from pathlib import Path
from urllib.parse import urlencode
BASE='http://127.0.0.1:5173/api/snack'
env={line.split('=',1)[0]:line.split('=',1)[1] for line in Path(__file__).resolve().parents[1].joinpath('.env.local').read_text().splitlines() if '=' in line}
admin=env['SERVICE_ADMIN_KEY'];passed=[]
def call(tenant='demo-stall',view='',key='',body=None,**query):
    params={'tenant':tenant,**query}
    if view:params['view']=view
    headers={'Content-Type':'application/json'}
    if key:headers['x-admin-key']=key
    req=urllib.request.Request(BASE+'?'+urlencode(params),headers=headers,data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(req,timeout=40) as res:return res.status,json.loads(res.read())
    except urllib.error.HTTPError as exc:return exc.code,json.loads(exc.read())
def post(tenant,action,payload,key):
    code,result=call(tenant,key=key,body={'action':action,'payload':payload})
    assert code==200,(action,code,result.get('error'));return result
def check(name,value):
    assert value,name;passed.append(name)
suffix=uuid.uuid4().hex[:8];a='verify-a-'+suffix;b='verify-b-'+suffix
ka=post('demo-stall','create_tenant',{'id':a,'name':'接口验证示例店 A'},admin)['createdTenant']['key']
kb=post('demo-stall','create_tenant',{'id':b,'name':'接口验证示例店 B'},admin)['createdTenant']['key']
check('new tenant receives unique merchant key',ka!=kb and ka!=admin)
check('key resolves correct store from different entry',post(b,'merchant_login',{},ka)['merchant']['id']==a)
check('key resolves without existing tenant entry',post('missing-demo-store','merchant_login',{},kb)['merchant']['id']==b)
check('original configured merchant key still resolves',post(a,'merchant_login',{},env['MERCHANT_ADMIN_KEY'])['merchant']['id']=='demo-stall')
check('wrong login rejected',call(a,key='bad',body={'action':'merchant_login'})[0]==401)
check('superadmin key cannot act as merchant login',call(a,key=admin,body={'action':'merchant_login'})[0]==401)
check('merchant key cannot read other store',call(b,'merchant',ka)[0]==401)
check('merchant cannot read superadmin sales report',call(a,'operations',ka)[0]==401)
check('public cannot read sales report',call(a,'operations')[0]==401)
check('merchant cannot create tenant keys',call(a,key=ka,body={'action':'create_tenant','payload':{'id':'denied-'+suffix,'name':'拒绝创建'}})[0]==401)
orders=[]
for tenant,key,count in [(a,ka,23),(b,kb,1)]:
    post(tenant,'service',{'action':'issue'},admin)
    post(tenant,'product',{'name':'测试餐品','category':'热食','price':1234,'active':True},key)
    _,catalog=call(tenant);product=catalog['products'][0]
    for i in range(count):
        result=post(tenant,'order',{'idempotencyKey':str(uuid.uuid4()),'accessToken':str(uuid.uuid4()),'items':[{'id':product['id'],'quantity':1,'expectedPrice':1234}],'pickupAt':catalog['slots'][i%12]['at'],'spice':'不辣','alias':'虚构接口验证'},'')
        if tenant==a:orders.append(result)
for o in orders[:3]:post(a,'order_action',{'id':o['id'],'action':'confirm_payment'},ka)
post(a,'order_action',{'id':orders[3]['id'],'action':'cancel'},ka)
_,report=call(a,'operations',admin);check('all orders included in aggregate, not only first page',report['summary']['totalOrders']==23 and len(report['orders'])==20)
check('confirmed sales exclude unpaid and cancelled orders',report['summary']['confirmedRevenue']==3702 and report['summary']['confirmedOrders']==3)
check('today uses Beijing order creation day',report['summary']['todayOrders']==23 and report['summary']['todayRevenue']==3702)
_,second=call(a,'operations',admin,page=2);check('second page retains full-store summary',len(second['orders'])==3 and second['pagination']['total']==23 and second['summary']['confirmedRevenue']==3702)
_,found=call(a,'operations',admin,search=orders[0]['id']);check('search by full order number',found['pagination']['total']==1 and found['orders'][0]['id']==orders[0]['id'])
_,code=call(a,'operations',admin,search=orders[0]['pickup_code']);check('search by pickup code',any(o['id']==orders[0]['id'] for o in code['orders']))
_,other=call(b,'operations',admin);check('store report is scoped to selected tenant',other['summary']['totalOrders']==1 and other['summary']['confirmedRevenue']==0)
check('other store search cannot reveal order',call(b,'operations',admin,search=orders[0]['id'])[1]['pagination']['total']==0)
row=found['orders'][0];check('report contains details without sensitive authentication fields',row['items'][0]['name']=='测试餐品' and all(k not in row for k in ['access_hash','request_hash','idempotency_key','login_key_hash','accessToken']))
check('invalid pagination rejected',call(a,'operations',admin,page=0)[0]==400)
_,overview=call(a,'service',admin);check('superadmin overview has independent tenant totals',next(t for t in overview['tenants'] if t['id']==a)['stats']['confirmedRevenue']==3702)
# Remove these disposable simulation records from the user's local demo database.
# IDs are random and created exclusively by this test; no existing tenant is touched.
cleanup={'tenantIds':[a,b]}
Path('/private/tmp/snack-operation-test-cleanup.json').write_text(json.dumps(cleanup))
Path(__file__).with_name('operations-validation-report.json').write_text(json.dumps({'count':len(passed),'passed':passed,'scope':'Local mock database, no real payment or merchant data'},ensure_ascii=False,indent=2)+'\n')
print('All',len(passed),'local operations checks passed.')
