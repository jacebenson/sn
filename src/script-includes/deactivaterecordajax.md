---
title: "DeactivateRecordAjax"
id: "deactivaterecordajax"
---

API Name: global.DeactivateRecordAjax

```js
var DeactivateRecordAjax = Class.create();
DeactivateRecordAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	initialize: function(request, response, processor) {
		AbstractAjaxProcessor.prototype.initialize.call(this, request, response, processor);
		this.log = new GSLog("com.snc.on_call_rotation.log.level", this.type);
	},

	/*
	* The following parameters are also available:
	* - 'sysparm_obj_id'
	* - 'sysparm_table_name'
	* - 'sysparm_nameofstack'
	*/
	getDeactivateRecord: function() {
		var gotoUrl = this.getParameter('sysparm_goto_url');
		var date = this.getParameter('sysparm_date');
		var dList = "";
		if (gotoUrl != null)
			dList += gotoUrl + ";";
		else
			dList += 'null;';

		if (date != null)
			dList += date + ";";
		return dList;
	},

	/*
	* The following parameters are also available:
	* - 'sysparm_disable_wf'
	*/
	proceedWithDeactivateFromForm: function() {
		var ocRotaCleaner = new OCRotaCleaner();
		var result = this.newItem("result");
		var objSysId = this.getParameter('sysparm_obj_id');
		var date = this.getParameter('sysparm_date');
		if (!ocRotaCleaner.isBeforeCurrentDate(ocRotaCleaner.dateToGlideDate(date)) || gs.hasRole('rota_admin')) {
			ocRotaCleaner.deactivateScheduleSpan(objSysId, date);
			result.setAttribute("deactivated", true);
		} else {
			result.setAttribute("deactivated", false);
			result.setAttribute("message", gs.getMessage("Rotas cannot be deactivated in the past."));
		}
	},
	
	proceedWithDeactivateFromList: function() {
		var objSysIds = this.getParameter('sysparm_obj_list');
		var tblName = this.getParameter('sysparm_table_name');
		
		var objList = objSysIds.split(',');
		var sysIdsToDel = '';
		for(var i=0; i<objList.length; i++) {
			if(objList[i] == null || objList[i] == '')
				continue;
			var gr = new GlideRecord(tblName);
			gr.get('sys_id', objList[i]);
			if(gr.canDelete()) {
				if(i > 0) sysIdsToDel += ',';
					sysIdsToDel += objList[i];
			}
		}
		if(sysIdsToDel != '') {
			var gRecord = new GlideRecord(tblName);
			gRecord.addQuery('sys_id','IN', sysIdsToDel);
			if (GlideDomainSupport.getCurrentDomainValueOrGlobal() == 'global')
				gRecord.queryNoDomain();
			else
				gRecord.query();
			gRecord.deleteMultiple();
		}
		return true;
	},
	
	toString: function() { return 'DeactivateRecordAjax'; }
});
```