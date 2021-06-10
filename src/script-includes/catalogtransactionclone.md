---
title: "CatalogTransactionClone"
id: "catalogtransactionclone"
---

API Name: global.CatalogTransactionClone

```js
gs.include('PrototypeServer');
gs.include('CatalogTransactionCheckout');

var CatalogTransactionClone = Class.create();

CatalogTransactionClone.prototype = Object.extendsObject(CatalogTransactionCheckout, {

    execute: function() {
        var requestID = this.request.getParameter("requestID");
        var catalogID = this.request.getParameter("sysparm_catalog");
        var catalogView = this.request.getParameter("sysparm_catalog_view");
        var map = this.request.getParameterMap();
        var gr = new GlideRecord("sc_request");
        if (!gr.get(requestID) || !gr.canRead())
            return;

        var roles = gs.getProperty('glide.sc.allow.clone.roles', '');
        if (roles != '' && !gs.hasRole(roles))
            return;

        var p = new GlideCatalogCloneWorker();
        p.setProgressName("Copying Request: " + gr.number);
        p.setRequest(requestID);
        p.setParameterMap(map);
        p.setBackground(true);
        p.start();

        var url = GlideappCatalogURLGenerator.getCloneStatusURL(p.getProgressID(), gr.number, gr.sys_id, catalogID, catalogView);
        this.response.sendRedirect(url);
    }
});
```