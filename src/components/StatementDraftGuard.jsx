import React,{useContext,useEffect} from 'react';
import {UNSAFE_DataRouterContext,useBlocker} from 'react-router-dom';
function RouterGuard({dirty}){
 const blocker=useBlocker(dirty);
 useEffect(()=>{if(blocker.state==='blocked'){if(window.confirm('Discard this unsaved statement draft?'))blocker.proceed();else blocker.reset();}},[blocker]);
 return null;
}
export default function StatementDraftGuard({dirty}){
 const router=useContext(UNSAFE_DataRouterContext);
 return router?<RouterGuard dirty={dirty}/>:null;
}
