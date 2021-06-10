---
title: "ProblemTaskStateSNC"
id: "problemtaskstatesnc"
---

API Name: global.ProblemTaskStateSNC

```js
var ProblemTaskStateSNC = Class.create();

ProblemTaskStateSNC.NEW               = "151";
ProblemTaskStateSNC.ASSESS            = "152";
ProblemTaskStateSNC.WORK_IN_PROGRESS  = "154";
ProblemTaskStateSNC.CLOSED            = "157";

ProblemTaskStateSNC.prototype = {
    initialize: function() {
    },

    type: 'ProblemTaskStateSNC'
};
```