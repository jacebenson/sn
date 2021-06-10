---
title: "MobileUtil"
id: "mobileutil"
---

API Name: global.MobileUtil

```js
gs.include("PrototypeServer");

var MobileUtil = Class.create();
MobileUtil.prototype = {
   
   getBannerText: function() {
      return gs.getProperty('glide.product.description.mobile');   
   },

   z: null
};


```