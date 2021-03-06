
var IPython = (function (IPython) {
    
    // ContainerCell (virtual class for cells that allow nesting, eg Tasks and branchsets, branches)

    var key = IPython.utils.keycodes;

    
    var ContainerCell = function(kernel){
	this.placeholder = "This is a Container Cell";
	IPython.Cell.apply(this, arguments);
	this.cell_type = null; //left to subclasses
	this.kernel = kernel || null;
	this.cells = [];
	
    };
    
    ContainerCell.prototype = new IPython.Cell();
    

  
    ContainerCell.prototype.auto_highlight = function () {
        this._auto_highlight(IPython.config.raw_cell_highlight);
    };
 
    
    //Cell indexing and lookup. lifted from notebook.js Notebook.prototype functions
    ContainerCell.prototype.get_cell_elements = function (all) {
	if(typeof all === 'undefined')
	    all = true;
	var ret = this.element.children("div.cell");
	if(!all)
	    ret = $(ret).not(".hidden");
        return ret;
    };
    
    
    ContainerCell.prototype.get_cell_element = function (index) {
        var result = null;
        var e = this.get_cell_elements().eq(index);
        if (e.length !== 0) {
            result = e;
        }
        return result;
    };
    

    /**
     * Get the numeric index of a given cell.
     * 
     * @method find_cell_index
     * @param {Cell} cell The provided cell
     * @return {Number} The cell's numeric index
     */
    ContainerCell.prototype.find_cell_index = function (cell) {
        var result = null;
        this.get_cell_elements().filter(function (index) {
            if ($(this).data("cell") === cell) {
                result = index;
            };
        });
        return result;
    };


    ContainerCell.prototype.set_dirty = function(value)
    {
	var notebook = this.parent;
	while(!(notebook instanceof IPython.Notebook))
	{
	    notebook = notebook.parent;
	}
	notebook.set_dirty(value);
    };
  


    /**
     * Insert a cell so that after insertion the cell is at given index.
     *
     * Similar to insert_above, but index parameter is mandatory
     *
     * Index will be brought back into the accissible range [0,n]
     *
     * @method insert_cell_at_index
     * @param type {string} in ['code','markdown','heading']
     * @param [index] {int} a valid index where to inser cell
     *
     * @return cell {cell|null} created cell or null
     **/
    ContainerCell.prototype.insert_cell_at_index = function(type, index){

        var ncells = this.ncells(true);
        var index = Math.min(index,ncells);
            index = Math.max(index,0);
        var cell = null;
	var that = this;

        if (ncells === 0 || this.is_valid_cell_index(index) || index === ncells) {
            if (type === 'code') {
                cell = new IPython.CodeCell(this.kernel);
                cell.set_input_prompt();
	    } else if (type === 'interactivecode') {
                cell = new IPython.IntCodeCell(this.kernel);
                cell.set_input_prompt();
            } else if (type === 'markdown') {
                cell = new IPython.MarkdownCell();
            } else if (type === 'raw') {
                cell = new IPython.RawCell();
	    } else if (type === 'task') {
		cell = new IPython.TaskCell(this.kernel);
	    } else if (type === 'altset') {
		cell = new IPython.AltSetCell(this.kernel);
	    } else if (type === 'alt') {
		cell = new IPython.AltCell(this.kernel);
            } else if (type === 'heading') {
                cell = new IPython.HeadingCell();
            }

            if(that._insert_element_at_index(cell.element,index)){
                cell.render();
                that.select(that.find_cell_index(cell));
                that.set_dirty(true);
		IPython.notebook.set_dirty(true);
		cell.parent = that;
//		that.cells.push(cell);
            }
        }
        return cell;

    };

    ContainerCell.prototype.insert_cell_below = function(type, index)
    {
//	index = this.index_or_selected(index);
	return this.insert_cell_at_index(type, index + 1);
    };

    ContainerCell.prototype.insert_cell_above = function(type, index)
    {
//	index = this.index_or_selected(index);
	return this.insert_cell_at_index(type, index);
    };
   


    /**
     * Scroll to the bottom of the container.
     * 
     * @method scroll_to_bottom
     */
    ContainerCell.prototype.scroll_to_bottom = function () {
        this.element.animate({scrollTop:this.element.get(0).scrollHeight}, 0);
    };



    /**
     * Insert an element at given cell index.
     *
     * @method _insert_element_at_index
     * @param element {dom element} a cell element
     * @param [index] {int} a valid index where to inser cell
     * @private
     *
     * return true if everything whent fine.
     **/
    ContainerCell.prototype._insert_element_at_index = function(element, index){
        if (element === undefined){
            return false;
        }

        var ncells = this.ncells();

        //if (ncells === 0) {
	//If index===ncells it now uses places the element before div.endspace, instead of after index-1. 
	//This allows a workaround that prevents problems with indexing/insertion in nonlinear documents 
	if (ncells === 0 || ncells === index) {
            this.element.children('div.end_container').before(element);
        } else if ( ncells === index ) {
	    //XXX GB superceded by above. Why did they have this as a special extra case?
            // special case append it the end, but not empty 
            this.get_cell_element(index-1).after(element);
        } else if (this.is_valid_cell_index(index)) {
            // otherwise always somewhere to append to
            this.get_cell_element(index).before(element);
        } else {
	    return false;
        }

	this.cells.splice(index, 0, $(element).data("cell"));
	

        if (this.undelete_index !== null && index <= this.undelete_index) {
            this.undelete_index = this.undelete_index + 1;
            this.set_dirty(true);
        }
        return true;
    };







  
    // Kernel related calls.
    
    //Note that this allows for nested tasks
    ContainerCell.prototype.set_kernel = function (kernel) {
        this.kernel = kernel;
	var ncells = this.ncells();
	for(var i=0; i<ncells; i++)
	{
	    var cell = this.get_cell(i);
	    if (cell instanceof IPython.CodeCell || cell instanceof IPython.ContainerCell || cell instanceof IPython.IntCodeCell) {
                cell.set_kernel(this.kernel)
	    };
	};
    };
    
    ContainerCell.prototype.get_cell = function (index) {
        var result = null;
        var ce = this.get_cell_element(index);
        if (ce !== null) {
            result = ce.data('cell');
        }
        return result;
    };
    
    
    ContainerCell.prototype.ncells = function (cell) {
        return this.get_cell_elements().length;
    };
    
    ContainerCell.prototype.is_valid_cell_index = function (index) {
	var max = this.ncells(true);
        if (index !== null && index >= 0 && index < this.ncells()) {
            return true;
        } else {
            return false;
        };
    };
    
    
    ContainerCell.prototype.get_selected_index = function () {
        var result = null;
        this.get_cell_elements().filter(function (index) {
            if ($(this).data("cell").selected === true) {
                result = index;
            };
        });
        return result;
    };
    

/*
  ContainerCell.prototype.create_element = function () {
        var cell = $("<div>").addClass('cell task_cell border-box-sizing');
        cell.attr('tabindex','2');
      cell.css({"background-color":"#99FFFF", "padding-left":"10px"});

        var input_area = $('<div/>').addClass('task_cell_input border-box-sizing');

        // The tabindex=-1 makes this div focusable.
      //var render_area = $('<div/>').addClass('task_cell_render border-box-sizing').addClass('rendered_html').attr('tabindex','-1');
      var render_area = $('<div/>').addClass('task_cell_render border-box-sizing').addClass('rendered_html');

      cell.append(input_area).append(render_area);

      var end_task = $('<div/>').addClass('end_task').height("30%");
      cell.append(end_task);
      this.element = cell;
    };

*/
    ContainerCell.prototype.handle_codemirror_keyevent = function (editor, event) {
        // This method gets called in CodeMirror's onKeyDown/onKeyPress
        // handlers and is used to provide custom key handling. Its return
        // value is used to determine if CodeMirror should ignore the event:
        // true = ignore, false = don't ignore.

        var that = this;
        if (event.which === key.UPARROW && event.type === 'keydown') {
            // If we are not at the top, let CM handle the up arrow and
            // prevent the global keydown handler from handling it.
            if (!that.at_top()) {
                event.stop();
                return false;
            } else {
                return true;
            };
        } else if (event.which === key.DOWNARROW && event.type === 'keydown') {
            // If we are not at the bottom, let CM handle the down arrow and
            // prevent the global keydown handler from handling it.
            if (!that.at_bottom()) {
                event.stop();
                return false;
            } else {
                return true;
            };
        };
        return false;
    };
    
    
    ContainerCell.prototype.select = function (index) {
	var cell;
	if(typeof index === 'undefined') { // || index == this.ncells() || index == -1) { 
	    cell = this;
	} else {
	    cell = this.get_cell(index);
	}
	var notebook = this.get_notebook();
	notebook.unselect_selected_cell();
	
	IPython.Cell.prototype.select.apply(cell);
	cell.code_mirror.refresh();
        cell.code_mirror.focus();

	if (cell.cell_type === 'heading') {
            $([IPython.events]).trigger('selected_cell_type_changed.Notebook',
					{'cell_type':cell.cell_type,level:cell.level}
				       );
        } else {
            $([IPython.events]).trigger('selected_cell_type_changed.Notebook',
					{'cell_type':cell.cell_type}
				       );
        };
     

    };

    ContainerCell.prototype.select_next = function() {
	var notebook = IPython.notebook;
	var cell = notebook.get_selected_cell();
	var cindex = this.find_cell_index(cell);
	var done = false;
	var tmpcell;
	while(!done && cindex < this.ncells(true) -1)
	{
	    tmpcell = this.get_cell(cindex + 1)
	    if(!$(tmpcell.element).hasClass("hidden_cell"))
	    {
		this.select(cindex+1);
		done = true;
	    }
	    cindex++
	};
	if(!done)
//	    if(cindex < this.ncells() - 1)
//		this.select(cindex + 1);
//	else
	{
	    var parent = this.parent;
	    cindex = parent.find_cell_index(this);
	    
//	    if(cindex < parent.ncells() - 1)
//		parent.select(cindex + 1);
//	    else
	    {
		this.select();
		this.parent.select_next();
	    }
	}
    };

    ContainerCell.prototype.select_prev = function() {
	var notebook = IPython.notebook;
	var cell = notebook.get_selected_cell();
	var cindex = this.find_cell_index(cell);
	if(cindex > 0)
	    this.select(cindex - 1);
	else
	    this.select();
    };

		

    ContainerCell.prototype.get_notebook = function(){
	var notebook = this.parent;
	while(!( notebook instanceof IPython.Notebook) )
	    notebook = notebook.parent

	return notebook;
    };
    
    
    ContainerCell.prototype.at_top = function () {
        var cursor = this.code_mirror.getCursor();
        if (cursor.line === 0 && cursor.ch === 0) {
            return true;
        } else {
            return false;
        }
    };
    
    
    ContainerCell.prototype.at_bottom = function () {
        var cursor = this.code_mirror.getCursor();
        if (cursor.line === (this.code_mirror.lineCount()-1) && cursor.ch === this.code_mirror.getLine(cursor.line).length) {
            return true;
        } else {
            return false;
        }
    };
    
    ContainerCell.prototype.set_text = function(text) {
        this.code_mirror.setValue(text);
        this.code_mirror.refresh();
    };
    
    //add a cell to the end of the container.
    ContainerCell.prototype.append_cell = function(type){
	//lifted from Notebook.prototype.instert_cell_below
	var cell = null;
        //if (this.ncells() === 0 || this.is_valid_cell_index(index)) {
        if (type === 'code') {
            cell = new IPython.CodeCell(this.kernel);
            cell.set_input_prompt();
	} else if (type === 'interactivecode') {
            cell = new IPython.IntCodeCell(this.kernel);
            cell.set_input_prompt();
        } else if (type === 'markdown') {
            cell = new IPython.MarkdownCell();
        } else if (type === 'html') {
            cell = new IPython.HTMLCell();
        } else if (type === 'raw') {
            cell = new IPython.RawCell();
	} else if (type === 'task') {
            cell = new IPython.TaskCell(this.kernel);
	} else if (type === 'altset') {
            cell = new IPython.AltSetCell(this.kernel);
	} else if (type === 'alt') {
            cell = new IPython.AltCell(this.kernel);
        } else if (type === 'heading') {
            cell = new IPython.HeadingCell();
        };
        if (cell !== null) {
	    cell.parent = this;
	    //this.element.find('div.end_container').before(cell.element);
	    this.element.children('div.end_container').before(cell.element);
            cell.render();
	    //            this.select(this.find_cell_index(cell));
            IPython.notebook.set_dirty(true);
	    this.cells.push(cell);
	 
            return cell;
        };
        return cell;
    };
    
    
    ContainerCell.prototype.fromJSON = function (data) {
        IPython.Cell.prototype.fromJSON.apply(this, arguments);
	//       if (data.cell_type === this.cell_type) {
        if (data.cells !== undefined) {
	    //lifted from notebook.js
	    var new_cells = data.cells;
	    var ncells = new_cells.length;
	 
	    var cell_data = null;
	    var new_cell = null;
	    var new_cell_objs = new Array(ncells);

	    for (var i=0; i<ncells; i++) {
                cell_data = new_cells[i];
                // VERSIONHACK: plaintext -> raw
                // handle never-released plaintext name for raw cells
                if (cell_data.cell_type === 'plaintext'){
		    cell_data.cell_type = 'raw';
                }
                
                //new_cell = this.insert_cell_below(cell_data.cell_type,i);
		new_cell = this.append_cell(cell_data.cell_type);
               // new_cell.fromJSON(cell_data);
	    }
	    for(var j=0; j<ncells; j++)
	    {
		new_cell = this.get_cell(j);
		new_cell.fromJSON(new_cells[j]);
	    };
	    //              this.set_rendered(data.rendered || '');
	    //              this.rendered = false;
	    //            this.render();
        };
	
	
	//     }
	//this.done_populating();
    };
    
    
    ContainerCell.prototype.bind_events = function(){
	IPython.Cell.prototype.bind_events.apply(this);
    };
    
    ContainerCell.prototype.toJSON = function(){
	var data = IPython.Cell.prototype.toJSON.apply(this);
	data.cell_type = this.cell_type;
	data.cells = [];
	for (var i =0; i < this.cells.length; i++)
	    data.cells[i] =  this.cells[i].toJSON();
	
	return data;
    };
    
    IPython.ContainerCell = ContainerCell;
    
    
    var TaskCell = function (kernel) {
	IPython.Cell.call(this);
	IPython.ContainerCell.apply(this, arguments);        
	this.placeholder = "This is a Task cell";
        this.code_mirror_mode = 'rst';
        this.cell_type = 'task';
	this.kernel = kernel || null;
	
        var that = this
	
        this.element.focusout(
            function() { that.auto_highlight(); }
        );
    };
    
    
    //    TaskCell.prototype = new IPython.TextCell();
    TaskCell.prototype = new ContainerCell();
    
    TaskCell.prototype.auto_highlight = function () {
        this._auto_highlight(IPython.config.raw_cell_highlight);
    };
    
    TaskCell.prototype.render = function () {
        this.rendered = true;
        this.edit();
    };
    
    
    TaskCell.prototype.set_kernel = function(kernel){
	IPython.ContainerCell.prototype.set_kernel.apply(this, arguments);
    };
    
    TaskCell.prototype.create_element = function () {
        var cell = $("<div></div>").addClass('cell task_cell border-box-sizing');
        cell.attr('tabindex','2');
	this.celltoolbar = new IPython.CellToolbar(this);
	cell.css({"background-color":"#CCFFFF", "padding-left":"10px"});
	
        var input_area = $('<div/>').addClass('task_cell_input border-box-sizing');
	var vbox = $('<div/>').addClass('vbox box-flex1');
	vbox.append(this.celltoolbar.element);
	vbox.append(input_area);
	cell.append(vbox);
	
        this.code_mirror = CodeMirror(input_area.get(0), {
            indentUnit : 4,
            mode: this.code_mirror_mode,
            theme: 'default',
            value: this.placeholder,
            readOnly: this.read_only,
            lineWrapping : true,
            extraKeys: {"Tab": "indentMore","Shift-Tab" : "indentLess"},
            onKeyEvent: $.proxy(this.handle_codemirror_keyevent,this)
        });

        // The tabindex=-1 makes this div focusable.
	//var render_area = $('<div/>').addClass('task_cell_render border-box-sizing').addClass('rendered_html').attr('tabindex','-1');
	var render_area = $('<div/>').addClass('task_cell_render border-box-sizing').addClass('rendered_html');
	
	//      cell.append(input_area).append(render_area);
	cell.append(vbox).append(render_area);
	//we use end_container here and elsewhere so we can use the inherited ContainerCell.pototype.append_cell in all cell types that allow nesting.
	var end_task = $('<div/>').addClass('end_container').height("30%");
	cell.append(end_task);
	this.element = cell;
    };
    
    TaskCell.prototype.handle_codemirror_keyevent = function (editor, event) {
        // This method gets called in CodeMirror's onKeyDown/onKeyPress
        // handlers and is used to provide custom key handling. Its return
        // value is used to determine if CodeMirror should ignore the event:
        // true = ignore, false = don't ignore.
	
        var that = this;
        if (event.which === key.UPARROW && event.type === 'keydown') {
            // If we are not at the top, let CM handle the up arrow and
            // prevent the global keydown handler from handling it.
            if (!that.at_top()) {
                event.stop();
                return false;
            } else {
                return true;
            };
        } else if (event.which === key.DOWNARROW && event.type === 'keydown') {
            // If we are not at the bottom, let CM handle the down arrow and
            // prevent the global keydown handler from handling it.
            if (!that.at_bottom()) {
                event.stop();
                return false;
            } else {
                return true;
            };
        };
        return false;
    };
    
    TaskCell.prototype.execute = function(){
	var ncells = this.ncells();
	var cell =  null;
	for(var i=0; i<ncells; i++)
	{
	    cell = this.get_cell(i);
	    if( !$(cell.element).hasClass("hidden_cell") && (cell instanceof IPython.CodeCell || cell instanceof IPython.ContainerCell || cell instanceof IPython.IntCodeCell))
		cell.execute();
	}
    };
    
    IPython.TaskCell = TaskCell;
    
    
    
    var AltSetCell = function (kernel) {
        IPython.ContainerCell.apply(this, arguments);
        this.placeholder = "This is an Alternatives cell";
        this.code_mirror_mode = 'rst';
	
        this.cell_type = 'altset';
	this.kernel = kernel || null;
	this.showing_alts = true;
	
        var that = this
	
        this.element.focusout(
            function() { that.auto_highlight(); }
        );
    };
    
    
    //    AltSetCell.prototype = new IPython.TextCell();
    AltSetCell.prototype = new ContainerCell();
    
    AltSetCell.prototype.auto_highlight = function () {
        this._auto_highlight(IPython.config.raw_cell_highlight);
    };
    
    AltSetCell.prototype.render = function () {
        this.rendered = true;
        this.edit();
    };
    
    
    AltSetCell.prototype.set_kernel = function(kernel){
	IPython.ContainerCell.prototype.set_kernel.apply(this, arguments);
    };
    
    AltSetCell.prototype.create_element = function () {
        var cell = $("<div>").addClass('cell alternatives_cell border-box-sizing');
        cell.attr('tabindex','2');
	this.celltoolbar = new IPython.CellToolbar(this);
	//display:inline-block should make divs show up next to eachother according to http://jsfiddle.net/sygL9/
	//cell.css({"background-color":"#99FFFF", "padding-left":"10px", "display":"inline-block"});
	cell.css({"background-color":"#CCFFFF", "padding-left":"10px", "display":"inline-block", "overflow":"hidden"});
	
        var input_area = $('<div/>').addClass('alts_cell_input border-box-sizing');
	that = this;
	var minmax = $("<button>-</button>").addClass("alts_showhide");
	minmax.click({altset:that}, function(evt) { evt.data.altset.toggle_alts_display()});
	minmax.css({"float":"right", "top":"5px", "right":"5px"});
	cell.append(minmax);
        this.code_mirror = CodeMirror(input_area.get(0), {
            indentUnit : 4,
            mode: this.code_mirror_mode,
            theme: 'default',
            value: this.placeholder,
            readOnly: this.read_only,
            lineWrapping : true,
            extraKeys: {"Tab": "indentMore","Shift-Tab" : "indentLess"},
            onKeyEvent: $.proxy(this.handle_codemirror_keyevent,this)
        });
	
        // The tabindex=-1 makes this div focusable.
	//var render_area = $('<div/>').addClass('alts_cell_render border-box-sizing').addClass('rendered_html').attr('tabindex','-1');
	var render_area = $('<div/>').addClass('alts_cell_render border-box-sizing').addClass('rendered_html');

	var vbox = $('<div/>').addClass('vbox box-flex1');
	vbox.append(this.celltoolbar.element);
	vbox.append(input_area).append(render_area)
	cell.append(vbox);
//	cell.append(input_area).append(render_area);
	
	//we use end_container here and elsewhere so we can use the inherited ContainerCell.pototype.append_cell in all cell types that allow nesting.
	var end_alts = $('<div/>').addClass('end_container').height("30%");
	cell.append(end_alts);
	this.element = cell;
    };
    
    AltSetCell.prototype.handle_codemirror_keyevent = function (editor, event) {
        // This method gets called in CodeMirror's onKeyDown/onKeyPress
        // handlers and is used to provide custom key handling. Its return
        // value is used to determine if CodeMirror should ignore the event:
        // true = ignore, false = don't ignore.
	
        var that = this;
        if (event.which === key.UPARROW && event.type === 'keydown') {
            // If we are not at the top, let CM handle the up arrow and
            // prevent the global keydown handler from handling it.
            if (!that.at_top()) {
                event.stop();
                return false;
            } else {
                return true;
            };
        } else if (event.which === key.DOWNARROW && event.type === 'keydown') {
            // If we are not at the bottom, let CM handle the down arrow and
            // prevent the global keydown handler from handling it.
            if (!that.at_bottom()) {
                event.stop();
                return false;
            } else {
                return true;
            };
        };
        return false;
    };
    
    
    AltSetCell.prototype.fromJSON = function(data)
    {
	//populate the normal way and then edit the style of the elements so that they show up side by side
	IPython.ContainerCell.prototype.fromJSON.apply(this, arguments);
	this.resize_alts();
	this.set_most_recently_run();

    };	
 

    AltSetCell.prototype.resize_alts = function()
    {
	var child_cells = this.element.children("div.alt_cell").filter(function(index) {
	    var cell = $(this).data("cell");
	    return !cell.minimized;
	});
	var widths = .95/child_cells.length * 100  + "%";
	child_cells.css({"width":widths});
    }
    
    AltSetCell.prototype.insert_cell_below = function(type, index)
    {
	var altcell = this.insert_cell_at_index("alt", index+1);
	altcell.insert_cell_at_index(type, 0);
	this.resize_alts();
	IPython.notebook.set_dirty(true);
    }
    
    AltSetCell.prototype.insert_cell_above = function(type, index)
    {
	var altcell = this.insert_cell_at_index("alt", index);
	altcell.insert_cell_at_index(type, 0);
	this.resize_alts();
	IPython.notebook.set_dirty(true);
    }
    
    AltSetCell.prototype.set_most_recently_run = function(cell)
    {
//	index = index || this.get_most_recently_run_index();
	if(! ( typeof cell === 'undefined'))
	{
	    var oldcell = this.get_most_recently_run();
	    if(oldcell)
		oldcell.most_recent = false;
	} else {
	    cell = this.get_most_recently_run();
	}
	
	if(cell)
	{
	    this.get_cell_elements().css({"background-color":"#AAFFFF"});
	    if(this.showing_alts)

		cell.element.css({"background-color":"#A0FF77"});
	    else
		cell.element.css({"background-color":"#CCFFFF"});
	    cell.most_recent = true;
	}
    };
    
    AltSetCell.prototype.get_most_recently_run = function()
    {
	var cell_els = this.get_cell_elements().toArray().filter(function(e) {
	    
	    var c = $(e).data("cell");
	    if(typeof c.most_recent === 'undefined')
		c.most_recent = false;
	    return c.most_recent;
	});
	if(! cell_els.length)
	    return undefined;
	else
	    return $(cell_els).eq(0).data("cell");
    };

    AltSetCell.prototype.toggle_alts_display = function() {
	this.get_cell_elements().map(function(i, e)
				     {
					 var c = $(e).data("cell");
					 if(!c.most_recent)
					     c.toggle_display(false);
					 return c;
				     });
	
	var cell = this.get_most_recently_run();
	this.showing_alts = !this.showing_alts;
	if(this.showing_alts)
	    
	    cell.element.css({"background-color":"#A0FF77"});
	else
	    cell.element.css({"background-color":"#CCFFFF"});

	this.resize_alts();


    };

    
    AltSetCell.prototype.execute = function() {

	var sel_alt = this.get_most_recently_run();
	sel_alt.execute();
	this.select();
    };

    

    IPython.AltSetCell = AltSetCell;
    
    var AltCell = function(kernel)
    {
	IPython.ContainerCell.apply(this, arguments);
        this.placeholder = "This is an Alt cell";
        this.code_mirror_mode = 'rst';
        this.cell_type = 'alt';
	this.kernel = kernel || null;
	this.most_recent = false;
	this.minimized = false;
        var that = this
	
        this.element.focusout(
            function() { that.auto_highlight(); }
        );
    };
    
    AltCell.prototype = new ContainerCell();
    
    AltCell.prototype.create_element = function () {
        var cell = $("<div>").addClass('cell alt_cell border-box-sizing');
        cell.attr('tabindex','2');
	this.celltoolbar = new IPython.CellToolbar(this);
	cell.css({"background-color":"#99FF55", "padding-left":"5px", "width":"auto", "display":"inline-block", "position":"relative"});
	var vbox = $('<div/>').addClass("vbox box-flex1");
        var input_area = $('<div/>').addClass('alt_cell_input border-box-sizing');

	vbox.append(this.celltoolbar.element);
	vbox.append(input_area);
	//cell.append(vbox);

        this.code_mirror = CodeMirror(input_area.get(0), {
            indentUnit : 4,
            mode: this.code_mirror_mode,
            theme: 'default',
            value: this.placeholder,
            readOnly: this.read_only,
            lineWrapping : true,
            extraKeys: {"Tab": "indentMore","Shift-Tab" : "indentLess"},
            onKeyEvent: $.proxy(this.handle_codemirror_keyevent,this)
        });

        // The tabindex=-1 makes this div focusable.
	//var render_area = $('<div/>').addClass('task_cell_render border-box-sizing').addClass('rendered_html').attr('tabindex','-1');
	var render_area = $('<div/>').addClass('alt_cell_render border-box-sizing').addClass('rendered_html');
	
	//cell.append(input_area).append(render_area);
	cell.append(vbox).append(render_area);
	//we use end_container here and belsewhere so we can use the inherited ContainerCell.pototype.append_cell in all cell types that allow nesting.
	var end_task = $('<div/>').addClass('end_container').height("30%");
	cell.append(end_task);
	this.element = cell;
    };

    AltCell.prototype.fromJSON = function(data)
    {
	//populate the normal way and then edit the style of the elements so that they show up side by side
	IPython.ContainerCell.prototype.fromJSON.apply(this, arguments);
	this.most_recent = data.most_recent;
    };	
    
    AltCell.prototype.toJSON = function()
    {
	//populate the normal way and then edit the style of the elements so that they show up side by side
	var dat = IPython.ContainerCell.prototype.toJSON.apply(this);
	dat.most_recent = this.most_recent;
	return dat;
    };	
  


    
//    IPython.AltCell = TaskCell
    AltCell.prototype.execute = function(){
	var ncells = this.ncells();
	var cell =  null;
	for(var i=0; i<ncells; i++)
	{
	    cell = this.get_cell(i);
	    if( !$(cell.element).hasClass("cell_hidden") && (cell instanceof IPython.CodeCell || cell instanceof IPython.ContainerCell || cell instanceof IPython.IntCodeCell))
		cell.execute( function(text){ return null;} );
	}

	var oldrecent = this.parent.get_most_recently_run();
	//	oldrecent.most_recent = false;
	//	this.most_recent = true;
	this.parent.set_most_recently_run(this);
	this.parent.resize_alts();
	//select the parent (AltSetCell) so that Notebook.execute_selected_cell will select the correct next cell
	this.parent.select();	
	
	
	/*	var parent = this.parent;
		var gparent = parent.parent;
		var pindex = gparent.find_cell_index(parent);
	if(pindex < gparent.ncells() - 1)
	gparent.select(pindex +1);
	else
	gparent.insert_cell_below("code", pindex);
	*/
    };
    AltCell.prototype.toggle_display = function(doresize)
    {
	this.minimized = !this.minimized;
	if(this.minimized)
	    this.element.css({display:"none"});
	else
	    this.element.css({display:"inline-block"});
	if( typeof doresize !== "undefined" && doresize)
	    this.parent.resize_alts();

    };

    IPython.AltCell = AltCell;
    
    return IPython;

}(IPython));