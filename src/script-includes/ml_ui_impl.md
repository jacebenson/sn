---
title: "ML_UI_Impl"
id: "ml_ui_impl"
---

API Name: sn_ml_ui.ML_UI_Impl

```js
var ML_UI_Impl = Class.create();
ML_UI_Impl.prototype = {
    initialize: function() {
		this.mluiDao = new ML_UI_DAO();
		this.logger = global.MLBaseLogger.getLogger("ML_UI_Impl");
    },
	
	getClusterData : function(solution_id, params){
		if (solution_id) {
			return this.mluiDao.getClusteringData(solution_id, params);
		} else {
			this.logger.error("Submit params invalid");
		}
	},
	
	getClusterTreeMapData: function (solution_id, params) {
		if (solution_id) {
			return this.mluiDao.getClusterTreeMapData(solution_id, params);
		} else {
			this.logger.error("Submit params invalid");
		}
	},
	
	getSolutionData : function(solution_id, params){
		if (solution_id) {
			return this.mluiDao.getSolutionData(solution_id, params);
		} else {
			this.logger.error("Submit params invalid");
		}
	},
	
    type: 'ML_UI_Impl'
};
```