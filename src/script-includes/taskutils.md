---
title: "TaskUtils"
id: "taskutils"
---

API Name: global.TaskUtils

```js
var TaskUtils = Class.create();
TaskUtils.prototype = Object.extendsObject(TaskUtilsSNC, {
    initialize: function() {
	TaskUtilsSNC.prototype.initialize.call(this);
    },

    /***************Custom changes****************/

    type: 'TaskUtils'
});
```