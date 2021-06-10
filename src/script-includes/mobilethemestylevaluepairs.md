---
title: "MobileThemeStyleValuePairs"
id: "mobilethemestylevaluepairs"
---

API Name: global.MobileThemeStyleValuePairs

```js
function MobileThemeStyleValuePairs() {
	var styleGR = new GlideRecord("sys_sg_theme_style");
	styleGR.query();
	var defaultValue = [];
	while (styleGR.next()) {
		defaultValue.push('"' + styleGR.getValue('name') + '": ""');
	}
	
	return "{" + defaultValue.join(",") + "}";
}
```