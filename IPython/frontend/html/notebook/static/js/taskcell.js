
var IPython = (function (IPython) {

   // ContainerCell (virtual class for cells that allow nesting, eg Tasks and branchsets, branches)

    var ContainerCell = function(kernel){
	this.placeholder = "This is a Container Cell";
	IPython.Cell.apply(this, arguments);
	this.cell_type = null; //left to subclasses
	this.kernel = kernel || null;
	
    }
    
    ContainerCell.prototype = new IPython.Cell();


    //Cell indexing and lookup. lifted from notebook.js Notebook.prototype functions
    ContainerCell.prototype.get_cell_elements = function () {
        return this.element.children("div.cell");
    };


    ContainerCell.prototype.get_cell_element = function (index) {
        var result = null;
        var e = this.get_cell_elements().eq(index);
        if (e.length !== 0) {
            result = e;
        }
        return result;
    };


    // Kernel related calls.

    //Note that this allows for nested tasks
    ContainerCell.prototype.set_kernel = function (kernel) {
        this.kernel = kernel;
	var ncells = this.ncells();
	for(var i=0; i<ncells; i++)
	{
	    var cell = this.get_cell(i);
	    if (cell instanceof IPython.CodeCell || cell instanceof IPython.ContainerCell) {
                cell.set_kernel(this.kernel)
	    };
	};
    }

   ContainerCell.prototype.get_cell = function (index) {
        var result = null;
        var ce = this.get_cell_element(index);
        if (ce !== null) {
            result = ce.data('cell');
        }
        return result;
    }


    ContainerCell.prototype.ncells = function (cell) {
        return this.get_cell_elements().length;
    };

   ContainerCell.prototype.is_valid_cell_index = function (index) {
       var max = this.ncells();
        if (index !== null && index >= 0 && index < this.ncells()) {
            return true;
        } else {
            return false;
        };
    }

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


    ContainerCell.prototype.select = function () {
        IPython.Cell.prototype.select.apply(this);
        this.code_mirror.refresh();
        this.code_mirror.focus();
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
        } else if (type === 'markdown') {
            cell = new IPython.MarkdownCell();
        } else if (type === 'html') {
            cell = new IPython.HTMLCell();
        } else if (type === 'raw') {
            cell = new IPython.RawCell();
	} else if (type === 'task') {
            cell = new IPython.TaskCell();
	} else if (type === 'altset') {
            cell = new IPython.AltSetCell();
	} else if (type === 'alt') {
            cell = new IPython.AltCell();
        } else if (type === 'heading') {
            cell = new IPython.HeadingCell();
        };
        if (cell !== null) {
		 //this.element.find('div.end_container').before(cell.element);
	    this.element.children('div.end_container').before(cell.element);
            cell.render();
	    //            this.select(this.find_cell_index(cell));
            this.dirty = true;
            return cell;
        };
	// };
        return cell;
    }


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
/*		for(i =0; i < ncells; i++)
		{
		    cell_data = new_cells[i];
                    // VERSIONHACK: plaintext -> raw
                    // handle never-released plaintext name for raw cells
                    if (cell_data.cell_type === 'plaintext'){
			cell_data.cell_type = 'raw';
                    }
		    new_cell_objs[i] = this.append_cell(cell_data.cell_type);
		}
		for(j=0; j< ncells; j++)
		{
		    new_cell_objs[j].fromJSON(new_cells[j]);
		}
*/

            for (var i=0; i<ncells; i++) {
                cell_data = new_cells[i];
                // VERSIONHACK: plaintext -> raw
                // handle never-released plaintext name for raw cells
                if (cell_data.cell_type === 'plaintext'){
                    cell_data.cell_type = 'raw';
                }
                
                //new_cell = this.insert_cell_below(cell_data.cell_type,i);
		new_cell = this.append_cell(cell_data.cell_type);
                new_cell.fromJSON(cell_data);
	    }
//              this.set_rendered(data.rendered || '');
  //              this.rendered = false;
    //            this.render();
            }


   //     }
	this.done_populating();
    };
    

    ContainerCell.prototype.bind_events = function(){
	IPython.Cell.prototype.bind_events.apply(this);
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
    }
    TaskCell.prototype.create_element = function () {
        var cell = $("<div>").addClass('cell task_cell border-box-sizing');
        cell.attr('tabindex','2');
	cell.css({"background-color":"#99FFFF", "padding-left":"10px"});
	
        var input_area = $('<div/>').addClass('task_cell_input border-box-sizing');
	
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

      cell.append(input_area).append(render_area);

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
	    if( cell instanceof IPython.CodeCell || cell instanceof IPython.ContainerCell)
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
    }
  AltSetCell.prototype.create_element = function () {
        var cell = $("<div>").addClass('cell alternatives_cell border-box-sizing');
        cell.attr('tabindex','2');
      //display:inline-block should make divs show up next to eachother according to http://jsfiddle.net/sygL9/
      cell.css({"background-color":"#99FFFF", "padding-left":"10px", "display":"inline-block"});

        var input_area = $('<div/>').addClass('alts_cell_input border-box-sizing');

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

      cell.append(input_area).append(render_area);

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
	
	var child_cells = this.element.children("div.alt_cell");
	var widths = 100/child_cells.length + "%";
	child_cells.css({"width":widths});
    };	

    IPython.AltSetCell = AltSetCell;

    var AltCell = function(kernel)
    {
	IPython.ContainerCell.apply(this, arguments);
        this.placeholder = "This is an Alt cell";
        this.code_mirror_mode = 'rst';
        this.cell_type = 'alt';
	this.kernel = kernel || null;

        var that = this

        this.element.focusout(
                function() { that.auto_highlight(); }
            );
    }
    
    AltCell.prototype = new ContainerCell();

    AltCell.prototype.create_element = function () {
        var cell = $("<div>").addClass('cell alt_cell border-box-sizing');
        cell.attr('tabindex','2');
	cell.css({"background-color":"#99FFFF", "padding-left":"5px", "float":"left"});
	
        var input_area = $('<div/>').addClass('alt_cell_input border-box-sizing');
	
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

      cell.append(input_area).append(render_area);

      //we use end_container here and elsewhere so we can use the inherited ContainerCell.pototype.append_cell in all cell types that allow nesting.
      var end_task = $('<div/>').addClass('end_container').height("30%");
      cell.append(end_task);
      this.element = cell;
    };

//    IPython.AltCell = TaskCell
    AltCell.prototype.execute = function(){
	var ncells = this.ncells();
	var cell =  null;
	for(var i=0; i<ncells; i++)
	{
	    cell = this.get_cell(i);
	    if( cell instanceof IPython.CodeCell || cell instanceof IPython.ContainerCell)
		cell.execute();
	}
    };

    IPython.AltCell = AltCell;

    return IPython;

}(IPython));