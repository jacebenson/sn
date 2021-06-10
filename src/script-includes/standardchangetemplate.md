---
title: "StandardChangeTemplate"
id: "standardchangetemplate"
---

API Name: global.StandardChangeTemplate

```js
var StandardChangeTemplate = Class.create();

StandardChangeTemplate.findById = StandardChangeTemplateSNC.findById;
StandardChangeTemplate.findAll = StandardChangeTemplateSNC.findAll;

StandardChangeTemplate.prototype = Object.extendsObject(StandardChangeTemplateSNC, {

	initialize: function(_gr, _gs) {
		StandardChangeTemplateSNC.prototype.initialize.call(this, _gr, _gs);
	},

    type: "StandardChangeTemplate"
});

```