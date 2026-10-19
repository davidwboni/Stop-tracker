import React from 'react';
import {useNavigate} from 'react-router-dom';
import {Eye, EyeOff} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';
import '../styles/app-header.css';

/**
 * Shared header control across Home, Records, Pay and Routes.
 * The same 44px avatar represents the current account everywhere.
 * An accessible image is used if available; otherwise initials are shown.
 */
export function ProfileAvatar({name='Driver',photoURL}){
 const initials=String(name||'Driver').trim().split(/\s+/).slice(0,2).map(x=>x?.[0]||'').join('').toUpperCase()||'D';
 return photoURL?<img src={photoURL} alt="" referrerPolicy="no-referrer"/>:<span aria-hidden="true">{initials}</span>;
}
export function ProfileShortcut(){
 const {user}=useAuth(),navigate=useNavigate();
 return <button type="button" className="st-profile-shortcut" aria-label="Open profile" title="Profile" onClick={()=>navigate('/app/profile')}><ProfileAvatar name={user?.displayName} photoURL={user?.photoURL}/></button>;
}

export default function HeaderControls({hidden,onToggleMoney}){
 return <div className="st-header-controls">
  {typeof onToggleMoney==='function'&&<button type="button" className="home-icon st-visibility-toggle"
    aria-label={hidden?'Show monetary amounts':'Hide monetary amounts'}
    aria-pressed={!!hidden}
    onClick={onToggleMoney}>
    {hidden?<EyeOff aria-hidden="true"/>:<Eye aria-hidden="true"/>}
  </button>}
  <ProfileShortcut/>
 </div>;
}
