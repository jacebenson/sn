---
title: "VisualTaskBoards"
id: "visualtaskboards"
---

API Name: global.VisualTaskBoards

```js
var VisualTaskBoards = Class.create();
VisualTaskBoards.prototype = {
	initialize: function() {
	},

	type: 'VisualTaskBoards'
};

VisualTaskBoards.showAddToBoardUIAction = function() {
	// In the future check for roles and other conditions
	return !GlideVTBCompatibility.isBlocked();
};

VisualTaskBoards.showShowVTBContextMenu = function() {
	var gr = new GlideRecord('vtb_board');
	if (!gr.canCreate()) return false;
	return !GlideVTBCompatibility.isBlocked();
};

VisualTaskBoards.getTaskIdsByBoard = function (boardID) {
	var grCard = new GlideRecord('vtb_card');
	grCard.addQuery('board', boardID);
	grCard.query();
	var taskIds = [];
	while (grCard.next()) {
		taskIds.push(grCard.task.toString());
	}
	
	return taskIds;
};
```