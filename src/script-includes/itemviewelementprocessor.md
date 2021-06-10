---
title: "ItemViewElementProcessor"
id: "itemviewelementprocessor"
---

API Name: global.ItemViewElementProcessor

```js
/**
 * Provides methods to process ItemView JSON.
 */
var ItemViewElementProcessor = Class.create();
ItemViewElementProcessor.prototype = {
    initialize: function() {},

    /**
     * Get list of element id's
     */
    getItemViewElementsIds: function(itemViewString) {
        var itemView = JSON.parse(itemViewString);
        var idList = [];
        var path = 'ViewGroup';
        this._getItemViewElementsIds(itemView, idList, path);
        return idList;
    },

    /**
     * Identify ItemView Elements and add Id's to this elements.
     */
    identifyItemViewElements: function(itemViewString) {
        var itemView = JSON.parse(itemViewString);
        var path = 'ViewGroup';
        this._identifyItemViewElements(itemView, path);
		
        return JSON.stringify(itemView);
    },

    _getItemViewElementsIds: function(itemViewElement, idList, currentPath) {
        if (this._isContainId(itemViewElement)) {
            var elementDescriptor = {
                id: itemViewElement['Id'],
                name: currentPath
            };
			
            if (this._isContainCellId(itemViewElement))
                elementDescriptor.cellId = itemViewElement['CellId'];


            if (this._isContainTitleCellId(itemViewElement))
                elementDescriptor.titleCellId = itemViewElement['TitleCellId'];


            if (this._isContainSubtitleCellId(itemViewElement))
                elementDescriptor.subtitleCellId = itemViewElement['SubtitleCellId'];

            idList.push(elementDescriptor);
        }

        for (var attribute in itemViewElement) {
            if (this._isObject(itemViewElement[attribute]))
                this._getItemViewElementsIds(itemViewElement[attribute], idList, currentPath + '/' + this._getPathName(itemViewElement[attribute]));

            if (this._isArray(itemViewElement[attribute]))
                for (var index = 0; index < itemViewElement[attribute].length; index++)
                    this._getItemViewElementsIds(itemViewElement[attribute][index], idList, currentPath + '/' + this._getPathName(itemViewElement[attribute][index]) + '_' + (index + 1));
			
        }
    },

    _identifyItemViewElements: function(itemViewElement, currentPath) {
        if (this._isNeedToAddId(itemViewElement))
            itemViewElement['Id'] = this._getId(currentPath);

        for (var attribute in itemViewElement) {
            if (this._isObject(itemViewElement[attribute]))
                this._identifyItemViewElements(itemViewElement[attribute], currentPath + '/' + this._getPathName(itemViewElement[attribute]));

            if (this._isArray(itemViewElement[attribute]))
                for (var index = 0; index < itemViewElement[attribute].length; index++)
                    this._identifyItemViewElements(itemViewElement[attribute][index], currentPath + '/' + this._getPathName(itemViewElement[attribute][index]) + '_' + (index + 1));
        }
    },

    _isNeedToAddId: function(itemViewElement) {
        if (!itemViewElement.hasOwnProperty('Type'))
            return false;
		
		var type = itemViewElement['Type'];
        if (type === 'ViewGroup' || type === 'Image' || type === 'Text' || type === 'Media-Image' || type === 'Media-Video')
            return true;

        return false;
    },

    _getPathName: function(itemViewElement) {
        if (!itemViewElement.hasOwnProperty('Type'))
            return 'Unknown';

        return itemViewElement['Type'];
    },

    _isContainId: function(itemViewElement) {
        if (itemViewElement.hasOwnProperty('Id'))
            return true;

        return false;
    },

	_isContainCellId: function(itemViewElement) {
        if (itemViewElement.hasOwnProperty('CellId'))
            return true;

        return false;
    },
   
	_isContainTitleCellId: function(itemViewElement) {
        if (itemViewElement.hasOwnProperty('TitleCellId'))
            return true;

        return false;
    },
    
	_isContainSubtitleCellId: function(itemViewElement) {
        if (itemViewElement.hasOwnProperty('TitleCellId'))
            return true;

        return false;
    },
    
	_isObject: function(what) {
        return Object.prototype.toString.call(what) === '[object Object]';
    },

    _isArray: function(what) {
        return Object.prototype.toString.call(what) === '[object Array]';
    },

    _getId: function(path) {
        var bytes = []; // char codes
        for (var i = 0; i < path.length; ++i) {
            var code = path.charCodeAt(i);
            bytes = bytes.concat([code]);
        }
		
        return this._bsd16a(bytes);
    },

    // BSD-16 checksum for get Id from itemView path.
    // 'Improved' and simplified version of BSD-16.
    _bsd16a: function(data) {
        for (var i = 0, sum = 255; i < data.length; i++) {
            sum += (sum >> 1) + ((sum) << 15) + data[i];
            sum &= 0xFFFF;
        }
		
        return sum + 100; //because mobile side needs that id starts from 100;
    },

    type: 'ItemViewElementProcessor'
};
```