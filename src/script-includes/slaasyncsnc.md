---
title: "SLAAsyncSNC"
id: "slaasyncsnc"
---

API Name: global.SLAAsyncSNC

```js
var SLAAsyncSNC = Class.create();

SLAAsyncSNC.SLA_ASYNC_QUEUE = "sla_async_queue";
SLAAsyncSNC.SLA_QUEUE_COUNTER_NAME = "SLA async queue counter";
SLAAsyncSNC.SLA_JOB_COUNTER_NAME = "SLA async job counter";

SLAAsyncSNC.prototype = {
    initialize: function() {
    },

    type: 'SLAAsyncSNC'
};
```