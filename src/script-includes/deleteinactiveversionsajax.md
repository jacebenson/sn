---
title: "DeleteInactiveVersionsAjax"
id: "deleteinactiveversionsajax"
---

API Name: global.DeleteInactiveVersionsAjax

```js
var DeleteInactiveVersionsAjax = Class.create();
DeleteInactiveVersionsAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {
   
   proceedWithDeleteFromForm: function() {
      var objSysId = this.getParameter('sysparm_obj_id');
      var tblName = this.getParameter('sysparm_table_name');
      // DEF0092179: changed GlideRecord to GlideRecordSecure
      var gRecord = new GlideRecordSecure(tblName);
      if (gRecord.get(objSysId))
         SNC.VersionControl.deleteInactiveVersions(gRecord);
      
      return true;
   },
 
   toString: function() { return 'DeleteInactiveVersionsAjax'; }
});

```