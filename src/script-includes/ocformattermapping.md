---
title: "OCFormatterMapping"
id: "ocformattermapping"
---

API Name: global.OCFormatterMapping

```js
var OCFormatterMapping = Class.create();
OCFormatterMapping.formatters = {'fullcalendar' : OCFullCalendarFormatter, 'dhtmlx' : OCDHTMLXCalendarFormatter};
OCFormatterMapping.prototype = {
	initialize: function() {
	},
	
	type: 'OCFormatterMapping'
};
```