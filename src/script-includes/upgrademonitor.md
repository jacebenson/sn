---
title: "UpgradeMonitor"
id: "upgrademonitor"
---

API Name: global.UpgradeMonitor

```js
var UpgradeMonitor = Class.create(); 
 
  UpgradeMonitor.prototype = Object.extendsObject(AbstractAjaxProcessor, { 
 
    get_status: function() { 
      return GlideUpgradeMonitor().get().getStatus();
    },
  });
```