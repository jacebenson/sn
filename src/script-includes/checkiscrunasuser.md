---
title: "CheckISCRunAsUser"
id: "checkiscrunasuser"
---

API Name: global.CheckISCRunAsUser

```js
var CheckISCRunAsUser = Class.create();
CheckISCRunAsUser.prototype = {
    validate: function() {
		var errors = [];
		this._checkUser('[AppSec] Daily Data Management',true,'admin');
		this._checkUser('[PA AppSec] Daily Data Collection',false,'');
		
    },
	_checkUser:function(job_name,hasRole,role){
		// validate run as user assigned to each job.
		
		var gr_job = GlideRecord('sysauto');
		var gr_user = GlideRecord('sys_user');
		
		
		gr_job.addEncodedQuery('name='+job_name);
		gr_job.query();
		while(gr_job.next()){
			if(hasRole){
				gr_user.addEncodedQuery('sys_id='+gr_job.run_as+'^roles='+role+'^locked_out=false');
			}
			else{
				gr_user.addEncodedQuery('sys_id='+gr_job.run_as+'^locked_out=false');
			}
			gr_user.query();
			if(!gr_user.next()){
				if(hasRole){
					this._insertAnnouncment(gr_job.sys_id,job_name,'sysauto_script',"Please assign valid Run As user with "+role+" role.");
				}
				else{
					this._insertAnnouncment(gr_job.sys_id,job_name,'sysauto_pa',"Please assign unlock Run As user or assign valid user.");
				}
			}
		}
	},
	_insertAnnouncment:function(job_id,job_name,job_table_name,message){
		// create announcment on ISC if run as user is property assigned to job.
		var gr_announcment = GlideRecord('announcement');
		gr_announcment.initialize();
		gr_announcment.active = true;
		gr_announcment.click_target = 'urlNew';
		gr_announcment.details_link_text = job_name;
		gr_announcment.details_url = '/'+job_table_name+'.do?sys_id='+job_id;
		gr_announcment.display_style = '7f8fe758c31023002ff2554d81d3ae99';
		gr_announcment.dismiss_options = 'session_dismissible';
		gr_announcment.from = new GlideDateTime();
		var gdt = new GlideDateTime();
		var to_time = new GlideTime();
		to_time.setValue('23:59:59');
		gdt.add(to_time);
		gr_announcment.to = gdt;
		gr_announcment.glyph = 'info-circle';
		gr_announcment.name = 'ISC:Invalid Run As User';
		gr_announcment.title = 'Invalid Run As User';
		gr_announcment.summary = message;
		gr_announcment.roles = 'admin';
		gr_announcment.type = '67eaf134e7a3320075c2a117c2f6a9d2,52fa79f8e763320075c2a117c2f6a991';
		var sys_id = gr_announcment.insert();
		
		var gr_m2m_announcement_portal = GlideRecord('m2m_announcement_portal');
		gr_m2m_announcement_portal.initialize();
		gr_m2m_announcement_portal.announcement = sys_id;
		gr_m2m_announcement_portal.sp_portal = 'bebfa187536a1300a699ddeeff7b1223';
		gr_m2m_announcement_portal.insert();
		
	},

    type: 'CheckISCRunAsUser'
};
```