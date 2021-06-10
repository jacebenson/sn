---
title: "omitCountGetViews"
id: "omitcountgetviews"
---

API Name: global.omitCountGetViews

```js
function omitCountGetViews(table, relatedList) {

	var views = [];
	var grListViews = new GlideRecord('sys_ui_list');

      if (relatedList && relatedList.indexOf('.') > -1) {
          relatedList = relatedList.slice(0, relatedList.indexOf('.'));
          grListViews.addQuery('name',relatedList);
          grListViews.addQuery('parent',table);
      } else {
          grListViews.addQuery('name',table);
          grListViews.addNullQuery('parent');
      }

      grListViews.query();

      while (grListViews.next()) {
          // Reports should not be returned as possible views.
          if(!grListViews.getDisplayValue('view').startsWith('Rpt')) {
              views.push(grListViews.getValue('view'));
              }
      }

	return views;
}
```