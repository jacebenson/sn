---
title: "mlRegressionSolutionStats"
id: "mlregressionsolutionstats"
---

API Name: sn_ml_ui.mlRegressionSolutionStats

```js
var mlRegressionSolutionStats = Class.create();
mlRegressionSolutionStats.prototype = {
    initialize: function() {},

    getStatsData: function(solution_id) {
        if (!solution_id) {
            this.logger.error("sys_id is not present");
            return;
        }
        var solution_gr = this.getGlideRecord(global.MLBaseConstants.ML_SOLUTION, solution_id);
        var stats = JSON.parse(solution_gr.getValue('regression_stats'));

        return stats;
    },

    getGlideRecord: function(table, sys_id) {
        var gr = '';
        if (table && sys_id) {
            gr = new GlideRecordSecure(table);
            gr.get(sys_id);
        }
        return gr;
    },

    type: 'mlRegressionSolutionStats'
};
```