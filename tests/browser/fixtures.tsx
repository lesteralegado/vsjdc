// Isolated UI fixtures. Vite builds only root index.html; these are never bundled for deployment.
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import StaffAppointmentList from '../../src/components/StaffAppointmentList'
import TrackAppointmentPage from '../../src/pages/TrackAppointmentPage'
import PageErrorBoundary from '../../src/components/PageErrorBoundary'
import { requireSupabase } from '../../src/lib/supabase'
import { clinicApi } from '../../src/lib/clinicApi'
if (!import.meta.env.DEV || !['127.0.0.1','localhost'].includes(location.hostname)) throw new Error('Local fixtures only')

const rows = Array.from({length:226},(_,index)=>({
 id:String(index+1).padStart(4,'0'),branch_id:'synthetic-branch',service_id:'synthetic-service',
 reference:`SYNTHETIC-${index+1}`,version:0,starts_at:'2030-01-01T01:00:00Z',ends_at:'2030-01-01T01:30:00Z',
 status:'pending',services:{name:'Synthetic service'},dentists:null,
 appointment_contacts:{patient_name:`Synthetic patient ${index+1}`,mobile:'00000000000',notes:''}
}))
requireSupabase().from = () => {
 let filtered=rows
 const query={select(){return query},eq(key,value){filtered=filtered.filter(row=>row[key]===value);return query},
 gte(){return query},lt(){return query},order(){return query},
 async range(start,end){return {data:filtered.slice(start,end+1),count:filtered.length,error:null}}}
 return query
}
requireSupabase().rpc = async () => ({data:null,error:{code:'42501',message:'This fixture does not perform staff mutations.'}})
clinicApi.bookingEnabled=false
clinicApi.trackingEnabled=true
clinicApi.track=async(reference)=>{
 window.trackingCalls=(window.trackingCalls||0)+1
 await new Promise(resolve=>{window.finishTracking=()=>resolve(null)})
 if(reference==='ERROR')throw new Error('Synthetic network failure')
 if(reference==='NOTFOUND')return null
 return {reference,status:'pending',branch:'Synthetic clinic',dentist:null,service:'Synthetic service',scheduledAt:'2030-01-01T01:00:00Z'}
}
export function Broken(){throw new Error('Synthetic render failure; no patient data')}
export function FailureFixture(){const[failed,setFailed]=useState(false);return <PageErrorBoundary>{failed?<Broken/>:<button className="btn btn-primary" onClick={()=>setFailed(true)}>Simulate page failure</button>}</PageErrorBoundary>}
const view=new URLSearchParams(location.search).get('view')
createRoot(document.getElementById('root')).render(<React.StrictMode><p className="notice m-5">LOCAL SYNTHETIC FIXTURES ? no database writes</p>{view==='tracking'?<TrackAppointmentPage/>:view==='failure'?<FailureFixture/>:<main className="mx-auto max-w-4xl p-5"><StaffAppointmentList branchId="synthetic-branch" branchName="Synthetic clinic" initialDate="2030-01-01" pendingOnly/></main>}</React.StrictMode>)
