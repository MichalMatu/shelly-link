export const renderRuntimeState = (
  debounceEnabled = false,
  executionEnabled = false,
  pulseEnabled = false,
  activeWindowEnabled = false
): string =>
  `var R={ls:null,l:0,t:null,h:null,tt:null,ht:null,b:null,r:null,on:false,rs:"boot",ds:"boot",lc:0,os:null,nh:0,fh:0,cv:null,vp:null,eo:null,ef:null,m:0,a:false,mn:false,af:"st",lk:false,mt:null,sa:0,u:[],fc:0${debounceEnabled ? ',db:null,di:0' : ''}${executionEnabled ? ',pa:false' : ''}${pulseEnabled ? ',ps:0,pc:0,pt:null,pn:null,pi:0' : ''}${activeWindowEnabled ? ',wo:-1,wi:0' : ''}};`;
