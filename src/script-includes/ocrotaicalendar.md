---
title: "OCRotaICalendar"
id: "ocrotaicalendar"
---

API Name: global.OCRotaICalendar

```js
var OCRotaICalendar = Class.create();
OCRotaICalendar.prototype = Object.extendsObject(OCRotaICalendarSNC, {

    initialize: function() {
		OCRotaICalendarSNC.prototype.initialize.call(this);
    },

    type: 'OCRotaICalendar'
});
```