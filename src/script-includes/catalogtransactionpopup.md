---
title: "CatalogTransactionPopup"
id: "catalogtransactionpopup"
---

API Name: global.CatalogTransactionPopup

```js
gs.include('PrototypeServer');
gs.include('AbstractTransaction');

var CatalogTransactionPopup = Class.create();

CatalogTransactionPopup.prototype =  Object.extendsObject(AbstractTransaction, {

   execute : function() {
   	 var sysparm_parent_sys_id = g_request.getParameter('sysparm_parent_sys_id');
        var sysparm_parent_table = g_request.getParameter('sysparm_parent_table');
        var sysparm_view = g_request.getParameter('sysparm_view');
        var sysparm_processing_hint = g_request.getParameter('sysparm_processing_hint');
        var params = {
            "sysparm_parent_sys_id": sysparm_parent_sys_id,
            "sysparm_parent_table": sysparm_parent_table,
            "sysparm_view": sysparm_view,
            "sysparm_processing_hint": sysparm_processing_hint
        };
       var sys_id = g_request.getParameter("sysparm_sys_id");
       var p = new GlideappCatItemPopper();	
       var s = p.renderPopup(this.processor.getController(), sys_id, params);
       this.processor.writeOutput(s);
   }
});
```