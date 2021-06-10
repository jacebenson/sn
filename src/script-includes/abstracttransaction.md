---
title: "AbstractTransaction"
id: "abstracttransaction"
---

API Name: global.AbstractTransaction

```js
gs.include("PrototypeServer");

var AbstractTransaction = Class.create();

AbstractTransaction.prototype = {

       initialize : function(request, response, processor) {
          this.request = request;
          this.response = response;
          this.processor = processor;
       },

       execute : function() {}
}
```