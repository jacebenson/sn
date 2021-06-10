---
title: "CABMeeting"
id: "cabmeeting"
---

API Name: sn_change_cab.CABMeeting

```js
var CABMeeting = Class.create();
//Pull in namespaced functions.
CABMeeting.newMeeting = CABMeetingSNC.newMeeting;

CABMeeting.prototype = Object.extendsObject(sn_change_cab.CABMeetingSNC, {
	
    type: 'CABMeeting'
});
```