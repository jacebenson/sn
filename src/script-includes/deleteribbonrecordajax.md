---
title: "DeleteRibbonRecordAjax"
id: "deleteribbonrecordajax"
---

API Name: global.DeleteRibbonRecordAjax

```js
var DeleteRibbonRecordAjax = Class.create();
DeleteRibbonRecordAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	
getCascadeDeleteTables: function() {
      var confNeeded = gs.getProperty('glide.ui.confirm_cascade_delete');
      if(confNeeded == null || confNeeded != "true") {
         return '';
      }
      var objSysId = this.getParameter('sysparm_obj_id');
      var tblName = this.getParameter('sysparm_table_name');
      var stackName = this.getParameter('sysparm_nameofstack');
	  var gotoUrl = this.getParameter('sysparm_goto_url');
      
      var dMap = GlideCascadeFromDelete.getCascadeTables(tblName, objSysId, stackName);
      var retUrl = dMap.remove("return_url");

      // Use the more explicit sysparm_goto_url if it exists
      if (gotoUrl && gotoUrl != "")
          retUrl = gotoUrl;
	   
      var dList = '';
 	  dList += this.getConfirmationMessage() + ';';
	
      if(retUrl != null) dList += retUrl + ';';
         else dList += 'null;';
         
      if( dMap.isEmpty()) {
         return dList;
      }
      
      // translate returned Java Map to a string format that client page can understand
      var objName = dMap.remove("name");
      dList += objName + ';';
      var itr = dMap.keySet().iterator();
      while(itr.hasNext()) {
         var dTbl = itr.next();
         var count = dMap.get(dTbl).intValue();
         dList = dList + count + ':' + dTbl + ',';
      }
      return dList;
   },
	
   getConfirmationMessage : function() {
		var settingTable = this.getParameter('sysparm_setting_table');
		var settings = new GlideAggregate('sys_aw_ribbon_setting');
		settings.addAggregate('COUNT');
		settings.addQuery('table', settingTable);
		settings.query();
		var count = 0;
		if (settings.next()) {
			count = settings.getAggregate('COUNT');
		}
		if (count == 1)
			return 'If deleted, this table inherits the parent table ribbon settings. Do you want to proceed?';
		else
			return 'null';
	},
   
   isDomainUsed: function() {
   	var domainSysID = this.getParameter('sysparm_domain_id');
   	return GlideDomainSupport.isDomainUsed(domainSysID);
   },
	
   areDomainsUsed: function() {
		var selDomains = this.getParameter('sysparm_domain_ids');
	    var selDomainsList = selDomains.split(",");
		for(i = 0; i<selDomainsList.length; i++){
			if(GlideDomainSupport.isDomainUsed(selDomainsList[i]))
				return true;
		}
		return false;
	},
   
   proceedWithDeleteFromForm: function() {
      var objSysId = this.getParameter('sysparm_obj_id');
      var tblName = this.getParameter('sysparm_table_name');
	  var disableWf = this.getParameter('sysparm_disable_wf');
	   
      var gRecord = new GlideRecord(tblName);
	  if(JSUtil.notNil(disableWf) && disableWf == 'true') {
		 gRecord.setWorkflow(false);
	  }
	  if(gRecord.get(objSysId)) {
		  if (gRecord.canDelete())
	         gRecord.deleteRecord();
      }
      return true;
   },
   
   proceedWithDeleteFromList: function() {
      var objSysIds = this.getParameter('sysparm_obj_list');
      var tblName = this.getParameter('sysparm_table_name');
	   
      var objList = objSysIds.split(',');
      var gr = new GlideRecord(tblName);
      gr.initialize();
      if(new GlideTableDescriptor(tblName).isValidField('sys_id'))
        this.deleteMultiple(gr,objList);
      else
        this.deleteSingle(gr,objList);
    
      return true;
    },
  
    deleteMultiple: function(gr,objList) {
      // PRB570448, remove records that cannot be deleted because of ACL restrictions first
      // then call deleteMultiple(), since it uses DBQuery and bypasses ACL checks.
      var tblName = gr.getTableName();
      var sysIdsToDel = '';
      for(var i=0; i<objList.length; i++) {
      
        if(objList[i] == null || objList[i] == '') {
          continue;
        }
      
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
    },
  
    deleteSingle: function(gr,objList) {
      for(var i=0; i<objList.length; i++) {
        if(objList[i] == null || objList[i] == '') {
          continue;
        }
        gr.get(objList[i]);
        if (gr.canDelete())
          gr.deleteRecord();
      }
   },
  
   toString: function() { return 'DeleteRibbonRecordAjax'; }
});
```