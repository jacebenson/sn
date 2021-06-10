---
title: "NavPageAjax"
id: "navpageajax"
---

API Name: global.NavPageAjax

```js
var NavPageAjax = Class.create();

NavPageAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {
  ajaxFunction_getUserHomepages: function() {
    return getUserHomepages();
  },

  ajaxFunction_getUserDashboards: function(){
    return getUserDashboards();
  }
});
```