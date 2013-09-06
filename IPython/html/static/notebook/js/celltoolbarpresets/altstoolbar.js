(function (IPython) {
    "use strict";

    var CellToolbar = IPython.CellToolbar;

    var example_preset = [];

    var simple_button = function(div, cell) {
	if(cell instanceof IPython.AltSetCell)
	{
            var button_container = $(div);
	    //      var button = $('<div/>').button({icons:{primary:'ui-icon-locked'}});
	    var button = $("<button/>")
		.addClass("btn btn-mini")
		.text("toggle branch display")
		.click(function(){
		    if(cell instanceof IPython.AltSetCell)
			cell.toggle_alts_display();
		});
            //  .css('height','16px')
            // .css('width','35px');
            button_container.append(button);
	}
    }
    
    CellToolbar.register_callback('toggle.branches',simple_button);
    example_preset.push('toggle.branches');

    CellToolbar.register_preset('Branches',example_preset);
    console.log('Example extension for toggling unused branches loaded.');

}(IPython));
