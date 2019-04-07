var holdGrid;
var gridDepth = 8;
var selectedBoi;
var showRewards = 0;
var isDebug = false;
var memoryCount = 0;
var blockCount = 0;
var unreachableCount = 0;
var efficiency = 0;
var placedRewardCount = 0;
var availableRewardPlaces = 0;
var pathString = "";
var stopHighlight = false;
var toggleHighlight = 0;
var tated = false;
var assInAssumption = false;
const constNodes = 112;

function toggleDebug() {
	isDebug = !isDebug;
}

function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createArray.apply(this, args);
    }

    return arr;
}

function allowPaths ( obj, north, south, west, east ) {
	obj.canN = north;
	obj.canS = south;
	obj.canW = west;
	obj.canE = east;
}

function addPaths ( obj, north, south, west, east ) {
	obj.hasN = north;
	obj.hasS = south;
	obj.hasW = west;
	obj.hasE = east;
}

function toggleRewards ( ) {
	let buff;
	$(".canHoldReward").removeClass("canHoldReward");
	$(".cantReach").removeClass("cantReach");
	$(".previewReward").removeClass("previewReward");
	if( showRewards == 0 ) {
		$.each( $("#grid > .row > .square"), function( key, value ) {
			let x = $(value).data("grid").x;
			let y = $(value).data("grid").y;
			if( holdGrid[x][y].canSpawnReward ) if( holdGrid[x][y].isEmpty ) $(value).html("");
		} );
	} else if( showRewards == 1 ) {
		$.each( $("#grid > .row > .square"), function( key, value ) {
			let x = $(value).data("grid").x;
			let y = $(value).data("grid").y;
			if( holdGrid[x][y].canSpawnReward ) {
				$(value).addClass("canHoldReward")
				if( holdGrid[x][y].isEmpty ) $(value).html("");
			}
		} );
	} else if( showRewards == 2) {
		$.each( $("#grid > .row > .square"), function( key, value ) {
			let x = $(value).data("grid").x;
			let y = $(value).data("grid").y;
			let ways = "";
			if( holdGrid[x][y].isEmpty ) $(value).html("");
			if( holdGrid[x][y].canSpawnReward ) {
				$(value).addClass("canHoldReward previewReward");
				if( holdGrid[x][y].canN ) ways+='N';
				if( holdGrid[x][y].canS ) ways+='S';
				if( holdGrid[x][y].canW ) ways+='W';
				if( holdGrid[x][y].canE ) ways+='E';
				if( ways=='N' ) $(value).html( $("#PP").html() );
				if( ways=='W' ) $(value).html( $("#PM").html() );
				if( ways=='E' ) $(value).html( $("#PO").html() );
				if( ways=='S' ) $(value).html( $("#PN").html() );
				if( ways=='NW' ) $(value).html( $("#PT").html() );
				if( ways=='NE' ) $(value).html( $("#PS").html() );
				if( ways=='SW' ) $(value).html( $("#PQ").html() );
				if( ways=='SE' ) $(value).html( $("#PR").html() );
			}
		} );
	}

}

function hideWalls ( hideYoWife ) {
	$.each( $("#grid > .row > .squareInvis"), function( key, value ) {
		let x = $(value).data("grid").x;
		let y = $(value).data("grid").y;
		let notEvenClose = false;

		if( hideYoWife ) $( value ).removeClass("hideYoKids"); else {
			// check surrounding
			for( let i = -1; i <= 1; i++ )
				for( let j = -1; j <= 1; j++ ) {
					// check bounds
					if( (x+i)>=0 && (x+i)<=(gridDepth*2) && (y+j)>=0 && (y+j)<=(gridDepth*2) ) {
						if( !holdGrid[x+i][y+j].isWall ) notEvenClose = true;
					}
				}
			if( !notEvenClose ) $( value ).addClass("hideYoKids");
		}
	} );
}

var checkPaths = function( x, y ) {
	let averagePath = 0;
	let possiblePaths = 0;
	let buff;
	
	if( holdGrid[x][y-1].isEmpty ) {
		buff = findShortestPath( [x, y-1], holdGrid );
		if( buff !== false ) { averagePath+=buff; possiblePaths++; }
	}
	if( y+1<17 && holdGrid[x][y+1].isEmpty ) {
		buff = findShortestPath( [x, y+1], holdGrid );
		if( buff !== false ) { averagePath+=buff; possiblePaths++; }
	}
	if( holdGrid[x-1][y].isEmpty ) {
		buff = findShortestPath( [x-1, y], holdGrid );
		if( buff !== false ) { averagePath+=buff; possiblePaths++; }
	}
	if( holdGrid[x+1][y].isEmpty ) {
		buff = findShortestPath( [x+1, y], holdGrid );
		if( buff !== false ) { averagePath+=buff; possiblePaths++; }
	}

	if( possiblePaths == 0 ) return false;
	return averagePath / possiblePaths;
}

var canRewardGoHere = function ( x, y ) {
	holdGrid[x][y].canN = false;
	holdGrid[x][y].canW = false;
	holdGrid[x][y].canS = false;
	holdGrid[x][y].canE = false;
	// 5. A reward node / memory amplifier can't spawn if distance from nexus is more than 7.
	// 8. A reward node can't spawn on top of a placed memory or another reward node.
	if( !holdGrid[x][y].isEmpty ) return false;
	// 4. A reward node can't spawn on top of a memory amplifier.
	if( holdGrid[x][y].isMemAmp ) return false;
	// 6. A reward node can't spawn directly adjacent to the nexus.
	if( ( x==8 && ( y-1==8 || y+1==8 ) ) || ( y==8 && ( x-1==8 || x+1==8 ) ) ) return false;

	// 7. A reward node can't spawn connected to a placed memory that's directly adjacent to the nexus.
	if( !holdGrid[x-1][y].isEmpty && isNexusNeighbour(x-1, y) ) return false;
	if( !holdGrid[x+1][y].isEmpty && isNexusNeighbour(x+1, y) ) return false;
	if( !holdGrid[x][y-1].isEmpty && isNexusNeighbour(x, y-1) ) return false;
	if( !holdGrid[x][y+1].isEmpty && isNexusNeighbour(x, y+1) ) return false;


	// get paths pointing towards location and the direction its from
	let paths = -1;
	let directions = [];
	let emptyNodes = 0;
	if( !holdGrid[x-1][y].isEmpty && !holdGrid[x-1][y].isWall ) { if( holdGrid[x-1][y].hasE ) { paths++; directions[paths] = "W"; } } else if( holdGrid[x-1][y].isEmpty ) emptyNodes++;
	if( !holdGrid[x+1][y].isEmpty && !holdGrid[x+1][y].isWall ) { if( holdGrid[x+1][y].hasW ) { paths++; directions[paths] = "E"; } } else if( holdGrid[x+1][y].isEmpty ) emptyNodes++;
	if( !holdGrid[x][y-1].isEmpty && !holdGrid[x][y-1].isWall ) { if( holdGrid[x][y-1].hasS ) { paths++; directions[paths] = "N"; } } else if( holdGrid[x][y-1].isEmpty ) emptyNodes++;
	if( !holdGrid[x][y+1].isEmpty && !holdGrid[x][y+1].isWall ) { if( holdGrid[x][y+1].hasN ) { paths++; directions[paths] = "S"; } } else if( holdGrid[x][y+1].isEmpty ) emptyNodes++;

	// 3. A reward node can't spawn if there is more than 1 path pointing towards it.
	if( paths > 0 ) return false;

	// check if there is at least 1 legal empty path
	if( emptyNodes == 0 && paths == -1 ) return false;

	//2. A reward node spawned on a straight line away from nexus, can only face the nexus, unless it connects to a placed memory.
	if( x<8 && y==8 && !holdGrid[x+1][y].isEmpty && paths == -1 ) return false; //WEST
	if( x>8 && y==8 && !holdGrid[x-1][y].isEmpty && paths == -1 ) return false; //EAST
	if( x==8 && y<8 && !holdGrid[x][y+1].isEmpty && paths == -1 ) return false; //NORTH
	if( x==8 && y>8 && !holdGrid[x][y-1].isEmpty && paths == -1 ) return false; //SOUTH

	//1. A reward node in a quadrant can spawn facing only the adjacent quadrants, unless it connects to a placed memory.
	if( x<8 && y<8 && ( !holdGrid[x+1][y].isEmpty && !holdGrid[x][y+1].isEmpty ) && paths == -1 ) return false; //NORTHWEST
	if( x>8 && y<8 && ( !holdGrid[x-1][y].isEmpty && !holdGrid[x][y+1].isEmpty ) && paths == -1 ) return false; //NORTHEAST
	if( x<8 && y>8 && ( !holdGrid[x+1][y].isEmpty && !holdGrid[x][y-1].isEmpty ) && paths == -1 ) return false; //SOUTHWEST
	if( x>8 && y>8 && ( !holdGrid[x-1][y].isEmpty && !holdGrid[x][y-1].isEmpty ) && paths == -1 ) return false; //SOUTHEAST

	//9. A reward node can't spawn connected to a reward node.
	if( paths == 0 && directions[0]=='N' && holdGrid[x][y-1].isReward ) return false; //NORTH
	if( paths == 0 && directions[0]=='S' && holdGrid[x][y+1].isReward ) return false; //SOUTH
	if( paths == 0 && directions[0]=='E' && holdGrid[x+1][y].isReward ) return false; //EAST
	if( paths == 0 && directions[0]=='W' && holdGrid[x-1][y].isReward ) return false; //WEST

	// ADD WAYS FOR RULE 1. A reward node in a quadrant can spawn facing only the adjacent quadrants, unless it connects to a placed memory.
	if( paths == -1 ) {
		if( x<8 && holdGrid[x+1][y].isEmpty ) holdGrid[x][y].canE = true; //WEST
		if( x>8 && holdGrid[x-1][y].isEmpty ) holdGrid[x][y].canW = true; //EAST
		if( y<8 && holdGrid[x][y+1].isEmpty ) holdGrid[x][y].canS = true; //NORTH
		if( y>8 && holdGrid[x][y-1].isEmpty ) holdGrid[x][y].canN = true; //SOUTH

		return true;
	}

	// add possible paths for reward
	for( let i = 0; i<=paths; i++ ) {
		if( directions[i]=='N' ) holdGrid[x][y].canN = true;
		if( directions[i]=='W' ) holdGrid[x][y].canW = true;
		if( directions[i]=='S' ) holdGrid[x][y].canS = true;
		if( directions[i]=='E' ) holdGrid[x][y].canE = true;
	}

	return true;
}

var isNexusNeighbour = function ( x, y ) {
	if( ( x==8 && ( y-1==8 || y+1==8 ) ) || ( y==8 && ( x-1==8 || x+1==8 ) ) ) return true;

	return false;
}

function checkRewards ( ) {
	blockCount = -4;
	memoryCount = 0;
	unreachableCount =0;
	efficiency = 0;
	pathString = "";
	availableRewardPlaces = 0;
	placedRewardCount = 0;


	for( let i = 1; i<=gridDepth*2; i++ )
		for( let j = 1; j<=gridDepth*2; j++ ) {
			if( !holdGrid[i][j].isWall ) pathString += holdGrid[i][j].pathVal;
			if( canRewardGoHere(i,j) ) holdGrid[i][j].canSpawnReward = true; else holdGrid[i][j].canSpawnReward = false;
			if( !holdGrid[i][j].canSpawnReward && !holdGrid[i][j].isWall ) blockCount++;
			if( !holdGrid[i][j].isEmpty && !holdGrid[i][j].isWall ) memoryCount++;
			if( holdGrid[i][j].canSpawnReward ) availableRewardPlaces++;
			if( holdGrid[i][j].isReward ) placedRewardCount++;

			/*if( holdGrid[i][j].canSpawnReward ) {
				holdGrid[i][j].isEmpty = false;
				let buff = checkPaths(i, j);
				if( buff === false ) { 
					holdGrid[i][j].canReachReward = false;
					unreachableCount++;
				} else {
					holdGrid[i][j].canReachReward = true;
					efficiency += buff;
				}
					//
				holdGrid[i][j].isEmpty = true;
			}*/
		}
	efficiency = efficiency / (constNodes - blockCount -unreachableCount);

	pathString+=showRewards;
	if( tated ) pathString+='1'; else pathString+='0';
	pathString += toggleHighlight;
	pathString += 'z';

	toggleRewards();

	$("#memCount").removeClass("redText")
	$("#cantReachCount").removeClass("redText");
	$("#placedRewardCount").removeClass("redText");


	$("#blockCount").text("Nodes Blocked: " + blockCount);
	$("#memCount").text("Memory Count: "+ memoryCount + "/40");
	$("#placedRewardCount").text("Rewards Placed: " + placedRewardCount);
	$("#availableRewardLocs").text("Available Reward Locations: " + availableRewardPlaces);
	$("input").val(pathString);
	if( placedRewardCount > 19 ) $("#placedRewardCount").addClass("redText");
	if( memoryCount > 40 ) $("#memCount").addClass("redText");
	if( unreachableCount > 18 ) $("#cantReachCount").addClass("redText");
}

/*function checkRewards ( ) {
	blockCount = 0;
	memoryCount = 0;
	unreachableCount =0;
	efficiency = 0;
	pathString = "";

	for( let i = 1; i<=gridDepth*2; i++ )
		for( let j = 1; j<=gridDepth*2; j++ ) {
			if( !holdGrid[i][j].isWall ) pathString += holdGrid[i][j].pathVal;
			let paths = 0;
			let canWays = 0;
			if( holdGrid[i][j].isEmpty && !holdGrid[i][j].isWall ) {
				if( holdGrid[i-1][j].hasE ) ++paths;
				if( holdGrid[i-1][j].canE ) ++canWays;
				if( holdGrid[i+1][j].hasW ) ++paths;
				if( holdGrid[i+1][j].canW ) ++canWays;
				if( holdGrid[i][j-1].hasS ) ++paths;
				if( holdGrid[i][j-1].canS ) ++canWays;
				if( holdGrid[i][j+1].hasN ) ++paths;
				if( holdGrid[i][j+1].canN ) ++canWays;
			}

			if( paths > 1 || ( paths == 0 && canWays==0 ) ) holdGrid[i][j].canSpawnReward = false; else holdGrid[i][j].canSpawnReward = true;
			if( !holdGrid[i][j].canSpawnReward && !holdGrid[i][j].isWall ) blockCount++;
			if( !holdGrid[i][j].isEmpty && !holdGrid[i][j].isWall ) memoryCount++;

			if( holdGrid[i][j].canSpawnReward ) {
				holdGrid[i][j].isEmpty = false;
				let buff = checkPaths(i, j);
				if( buff === false ) { 
					holdGrid[i][j].canReachReward = false;
					unreachableCount++;
				} else {
					holdGrid[i][j].canReachReward = true;
					efficiency += buff;
				}
					//
				holdGrid[i][j].isEmpty = true;
			}
		}
	efficiency = efficiency / (constNodes - blockCount -unreachableCount);

	if( showRewards ) pathString+='1'; else pathString+='0';
	if( tated ) pathString+='1'; else pathString+='0';
	if( toggleHighlight == 0 ) pathString+='0'; else if( toggleHighlight == 1 ) pathString+='1'; else pathString+=2;

	toggleRewards();
	toggleRewards();
	$("#memCount").removeClass("redText")
	$("#cantReachCount").removeClass("redText");
	$("#blockCount").text("Nodes Blocked: " + blockCount);
	$("#memCount").text("Memory Count: "+ memoryCount + "/40");
	$("#cantReachCount").text("Nodes Unreachable: " + unreachableCount);
	$("#efficiencyPath").text("Avg Path to Node: " + efficiency.toFixed(2));
	$("input").val(pathString);
	if( memoryCount > 40 ) $("#memCount").addClass("redText");
	if( unreachableCount > 18 ) $("#cantReachCount").addClass("redText");
}*/

var getCode = function ( ch ) {
	return ch.charCodeAt(0);
}

var toCode = function ( n ) {
	return String.fromCharCode(n);
}

function addMemAmp ( ele ) {


}

function addWays ( ele, importingAmps ) {
	let posX = ele.data("grid").x;
	let posY = ele.data("grid").y;

	if( isDebug ) {
		console.log(posX, posY, holdGrid[posX][posY]);
		canRewardGoHere(posX, posY);
		return;
	}

	if( ele.data("wall") ) return;

	let checkMeUp = $( selectedBoi ).attr("data");

	if( checkMeUp == 'a' ) {
		if( holdGrid[posX][posY].isMemAmp ) {
			holdGrid[posX][posY].isMemAmp = false;
			$( ele ).removeClass("hasMemoryAmplifier");
			holdGrid[posX][posY].pathVal =  holdGrid[posX][posY].pathVal.toUpperCase();
		} else {
			holdGrid[posX][posY].isMemAmp = true;
			$( ele ).addClass("hasMemoryAmplifier");
			holdGrid[posX][posY].pathVal =  holdGrid[posX][posY].pathVal.toLowerCase();
		}

		checkRewards();
		lowLight();

		return;
	}

	if( $( selectedBoi ).html() == "" || ( $( selectedBoi ).html() == $( ele ).html() && !holdGrid[posX][posY].isEmpty ) )  {
		holdGrid[posX][posY].isReward = false;
		holdGrid[posX][posY].isMemAmp = false;
		$( ele ).removeClass("hasMemoryAmplifier");
		$( ele ).html( "" );
		addPaths( holdGrid[posX][posY], false, false, false, false);
		holdGrid[posX][posY].isEmpty = true;
		holdGrid[posX][posY].pathVal = "A";
		checkRewards();
		lowLight();
		return;
	}

	let ways = "";
	let buffReward = $( selectedBoi ).find("div").hasClass('rewardBox');

	if( $( selectedBoi ).find("div").hasClass('up-corner') ) ways+= 'N';
	if( $( selectedBoi ).find("div").hasClass('left-corner') ) ways+= 'W';
	if( ( $( selectedBoi ).find("div").hasClass('down-corner2') || $( selectedBoi ).find("div").hasClass('down-corner') ) ) ways+= 'S';
	if( $( selectedBoi ).find("div").hasClass('right-corner') ) ways+='E';

	if( buffReward && !canItGoHere(ways, posX, posY, true, true) ) return;
	else if( !buffReward && !canItGoHere(ways, posX, posY, false, true) ) return;

	//cant place reward facing wall
	/*if( buffReward ) {
		if( $( selectedBoi ).find("div").hasClass('left-corner') && holdGrid[posX-1][posY].isWall  ) return;
		if( $( selectedBoi ).find("div").hasClass('right-corner') && holdGrid[posX+1][posY].isWall ) return;
		if( $( selectedBoi ).find("div").hasClass('up-corner') && holdGrid[posX][posY-1].isWall ) return;
		if( $( selectedBoi ).find("div").hasClass('down-corner') && holdGrid[posX][posY+1].isWall ) return;
	}*/

	addPaths( holdGrid[posX][posY], false, false, false, false);
	holdGrid[posX][posY].isReward = false;
	holdGrid[posX][posY].isMemAmp = false;

	if( $( selectedBoi ).find("div").hasClass('left-corner') ) { holdGrid[posX][posY].hasW = true; }
	if( $( selectedBoi ).find("div").hasClass('right-corner') ) { holdGrid[posX][posY].hasE = true; }
	if( $( selectedBoi ).find("div").hasClass('up-corner') ) { holdGrid[posX][posY].hasN = true; }
	if( $( selectedBoi ).find("div").hasClass('down-corner') || $( selectedBoi ).find("div").hasClass('down-corner2') ) { holdGrid[posX][posY].hasS = true; }

	holdGrid[posX][posY].isEmpty = false;

	if( checkMeUp == 'M' || checkMeUp == 'N' || checkMeUp == 'O' || checkMeUp == 'P' ) holdGrid[posX][posY].isReward = true;

	if( importingAmps ) {
		$( ele ).addClass('hasMemoryAmplifier');
		holdGrid[posX][posY].pathVal = checkMeUp.toLowerCase();
		holdGrid[posX][posY].isMemAmp = true;
	} else holdGrid[posX][posY].pathVal = checkMeUp;

	$( ele ).html( $( selectedBoi ).html() );

	checkRewards();
	lowLight();
}

var canItGoHere = function ( ways, x, y, rew, placement ) {

	if( toggleHighlight == 1 && !placement && !holdGrid[x][y].isEmpty ) return;

	//check reward for adjacency to nexus
	if( rew && ( ( x==8 && y==7 ) || ( x==8 && y==9 ) || ( x==7 && y==8 ) || ( x==9 && y==8 ) ) ) return false;

	if( ways.indexOf('N') !== -1 ) {
		if( rew && holdGrid[x][y-1].isWall ) return false;
		if( !holdGrid[x][y-1].isEmpty && !holdGrid[x][y-1].hasS && !holdGrid[x][y-1].isWall ) return false;
	} else if( !holdGrid[x][y-1].isEmpty && holdGrid[x][y-1].hasS ) return false;

	if( ways.indexOf('W') !== -1 ) {
		if( rew && holdGrid[x-1][y].isWall ) return false;
		if( !holdGrid[x-1][y].isEmpty && !holdGrid[x-1][y].hasE && !holdGrid[x-1][y].isWall ) return false;
	} else if( !holdGrid[x-1][y].isEmpty && holdGrid[x-1][y].hasE ) return false;

	if( ways.indexOf('S') !== -1 ) {
		if( rew && holdGrid[x][y+1].isWall ) return false;
		if( !holdGrid[x][y+1].isEmpty && !holdGrid[x][y+1].hasN && !holdGrid[x][y+1].isWall ) return false;
	} else if( !holdGrid[x][y+1].isEmpty && holdGrid[x][y+1].hasN ) return false;

	if( ways.indexOf('E') !== -1 ) {
		if( rew && holdGrid[x+1][y].isWall ) return false;
		if( !holdGrid[x+1][y].isEmpty && !holdGrid[x+1][y].hasW && !holdGrid[x+1][y].isWall ) return false;
	} else if( !holdGrid[x+1][y].isEmpty && holdGrid[x+1][y].hasW ) return false;

	return true;
}

function chooseRoute( ele ) {
	$(".selectedBruv").removeClass('selectedBruv');
	$(ele).addClass('selectedBruv');
	selectedBoi = ele;

	lowLight();
}

function lowLight() {
	$("#grid > .row > .square").removeClass("lightMeUp");

	if( toggleHighlight == 0 ) return;

	let ways = "";
	let buffReward = false;
	let buffId = $(selectedBoi).attr('id');

	//check if its a reward node selected for placement
	if( buffId=='PM' || buffId=='PN' || buffId=='PO' || buffId=='PP' ) buffReward = true;

	if( $( selectedBoi ).find("div").hasClass('up-corner') ) ways+= 'N';
	if( $( selectedBoi ).find("div").hasClass('left-corner') ) ways+= 'W';
	if( ( $( selectedBoi ).find("div").hasClass('down-corner2') || $( selectedBoi ).find("div").hasClass('down-corner') ) ) ways+= 'S';
	if( $( selectedBoi ).find("div").hasClass('right-corner') ) ways+='E';

	$.each( $("#grid > .row > .square"), function( key, value ) {
		let x = $(value).data("grid").x;
		let y = $(value).data("grid").y;
		if( buffId == "Pa" && ( holdGrid[x][y].isEmpty || toggleHighlight == 2 ) ) $( value ).addClass("lightMeUp"); //highlight amp placement
			else if( buffId == "PA" ) $( value ).addClass("lightMeUp"); // highlight empty node placement
			else if( buffReward && canItGoHere(ways, x, y, true, false) ) $( value ).addClass("lightMeUp"); //highlight reward node placement
			else if( !buffReward && canItGoHere(ways, x, y, false, false) ) $( value ).addClass("lightMeUp"); //highlight memory node placement
	} );
}

function fillGrid() {
	let buff;
	let canN, canS, canW, canE;
	for( let i = -gridDepth; i<=gridDepth; i++ ) {
		for( let j= -gridDepth; j<=gridDepth; j++ )
			{
				holdGrid[i+gridDepth][j+gridDepth] = [];
				holdGrid[i+gridDepth][j+gridDepth].isReward = false;
				canN = false; canS = false; canW = false; canE = false;
				buff = $(".row").eq(j+gridDepth).find("div").eq(i+gridDepth);

				holdGrid[i+gridDepth][j+gridDepth].isWall = true;
				holdGrid[i+gridDepth][j+gridDepth].canSpawnReward = false;
				holdGrid[i+gridDepth][j+gridDepth].canSpawnModifier = false;
				holdGrid[i+gridDepth][j+gridDepth].hasBeen = false;
				holdGrid[i+gridDepth][j+gridDepth].canReachReward = true;
				buff.data("wall", true);
				holdGrid[i+gridDepth][j+gridDepth].isEmpty = false;
				holdGrid[i+gridDepth][j+gridDepth].pathVal = "A";
				if( !buff.hasClass("squareInvis") ) {
					pathString+="A";
					holdGrid[i+gridDepth][j+gridDepth].isEmpty = true;
					holdGrid[i+gridDepth][j+gridDepth].canSpawnReward = true;
					holdGrid[i+gridDepth][j+gridDepth].canSpawnModifier = true;
					if( $(".row").eq(j+gridDepth-1).find("div").eq(i+gridDepth).hasClass("square") ) canN = true;
					if( $(".row").eq(j+gridDepth+1).find("div").eq(i+gridDepth).hasClass("square") ) canS = true;
					if( $(".row").eq(j+gridDepth).find("div").eq(i+gridDepth-1).hasClass("square") ) canW = true;
					if( $(".row").eq(j+gridDepth).find("div").eq(i+gridDepth+1).hasClass("square") ) canE = true;
					buff.data("wall", false);
					holdGrid[i+gridDepth][j+gridDepth].isWall = false;
					buff.click(function() {
						addWays( $( this ), false );
					});
				}

				holdGrid[i+gridDepth][j+gridDepth].canN = canN; holdGrid[i+gridDepth][j+gridDepth].canS = canS; holdGrid[i+gridDepth][j+gridDepth].canW = canW; holdGrid[i+gridDepth][j+gridDepth].canE = canE;
				holdGrid[i+gridDepth][j+gridDepth].hasN = false; holdGrid[i+gridDepth][j+gridDepth].hasS = false; holdGrid[i+gridDepth][j+gridDepth].hasW = false; holdGrid[i+gridDepth][j+gridDepth].hasE = false;
				buff.data("grid", { "x": i+gridDepth, "y": j+gridDepth } );

		}
	}
	addPaths( holdGrid[8][8], true, true, true, true);

	checkRewards();
}


function allowSelection() {
	$("#selectMeBruv > div").click(function() {
		chooseRoute( $( this ) ) ;
	})
	chooseRoute( $("#selectMeBruv > div").eq(0) );
}

function importPath( path ) {
	if( path.length < 112 ) return;
	if( path.length == 115 ) path = convertOldImport( path );
	let count = 0;
	for( let i = 1; i<=gridDepth*2; i++ )
		for( let j = 1; j<=gridDepth*2; j++ ) {
			if( !holdGrid[i][j].isWall ) {
				holdGrid[i][j].pathVal = path[count];
				
				count++;
			}
		}

	stopHighlight = true;
	$("#grid > .row > .square").html("");
	$.each( $("#grid > .row > .square"), function( key, value ) {
		let buff = holdGrid[$(value).data("grid").x][$(value).data("grid").y].pathVal;
		$( value ).removeClass("hasMemoryAmplifier");
		if( buff == "A" ) {
			chooseRoute( $( "#PA" ) );
			addWays( $( value ), false );
		}else if( buff == "B" ) {
			chooseRoute( $( "#PB" ) );
			addWays( $( value ), false );
		}else if( buff == "C" ) {
			chooseRoute( $( "#PC" ) );
			addWays( $( value ), false );
		}else if( buff == "D" ) {
			chooseRoute( $( "#PD" ) );
			addWays( $( value ), false );
		}else if( buff == "E" ) {
			chooseRoute( $( "#PE" ) );
			addWays( $( value ), false );
		}else if( buff == "F" ) {
			chooseRoute( $( "#PF" ) );
			addWays( $( value ), false );
		}else if( buff == "G" ) {
			chooseRoute( $( "#PG" ) );
			addWays( $( value ), false );
		}else if( buff == "H" ) {
			chooseRoute( $( "#PH" ) );
			addWays( $( value ), false );
		}else if( buff == "I" ) {
			chooseRoute( $( "#PI" ) );
			addWays( $( value ), false );
		}else if( buff == "J" ) {
			chooseRoute( $( "#PJ" ) );
			addWays( $( value ), false );
		}else if( buff == "K" ) {
			chooseRoute( $( "#PK" ) );
			addWays( $( value ), false );
		}else if( buff == "L" ) {
			chooseRoute( $( "#PL" ) );
			addWays( $( value ), false );
		}else if( buff == "M" ) {
			chooseRoute( $( "#PM" ) );
			addWays( $( value ), false );
		}else if( buff == "N" ) {
			chooseRoute( $( "#PN" ) );
			addWays( $( value ), false );
		}else if( buff == "O" ) {
			chooseRoute( $( "#PO" ) );
			addWays( $( value ), false );
		}else if( buff == "P" ) {
			chooseRoute( $( "#PP" ) );
			addWays( $( value ), false );
		}else if( buff == "a" ) {
			chooseRoute( $( "#Pa" ) );
			addWays( $( value ), true );
		}else if( buff == "b" ) {
			chooseRoute( $( "#PB" ) );
			addWays( $( value ), true );
		}else if( buff == "c" ) {
			chooseRoute( $( "#PC" ) );
			addWays( $( value ), true );
		}else if( buff == "d" ) {
			chooseRoute( $( "#PD" ) );
			addWays( $( value ), true );
		}else if( buff == "e" ) {
			chooseRoute( $( "#PE" ) );
			addWays( $( value ), true );
		}else if( buff == "f" ) {
			chooseRoute( $( "#PF" ) );
			addWays( $( value ), true );
		}else if( buff == "g" ) {
			chooseRoute( $( "#PG" ) );
			addWays( $( value ), true );
		}else if( buff == "h" ) {
			chooseRoute( $( "#PH" ) );
			addWays( $( value ), true );
		}else if( buff == "i" ) {
			chooseRoute( $( "#PI" ) );
			addWays( $( value ), true );
		}else if( buff == "j" ) {
			chooseRoute( $( "#PJ" ) );
			addWays( $( value ), true );
		}else if( buff == "k" ) {
			chooseRoute( $( "#PK" ) );
			addWays( $( value ), true );
		}else if( buff == "l" ) {
			chooseRoute( $( "#PL" ) );
			addWays( $( value ), true );
		}else if( buff == "m" ) {
			chooseRoute( $( "#PM" ) );
			addWays( $( value ), true );
		}else if( buff == "n" ) {
			chooseRoute( $( "#PN" ) );
			addWays( $( value ), true );
		}else if( buff == "o" ) {
			chooseRoute( $( "#PO" ) );
			addWays( $( value ), true );
		}else if( buff == "p" ) {
			chooseRoute( $( "#PP" ) );
			addWays( $( value ), true );
		}
	} );

	if( path.length != 116 ) return;

	showRewards = path[112];
	if( (path[113] == '1' && !tated) || (path[113] == '0' && tated) ) rotatePls();
	toggleHighlight = path[114];

	checkRewards();
	stopHighlight = false;
	lowLight();
}

var convertOldImport = function( path ) {
	let holdPath = "";
	let count = 0;
	for( let i = 1; i<=gridDepth*2; i++ )
		for( let j = 1; j<=gridDepth*2; j++ ) {
			if( !holdGrid[i][j].isWall ) {
				let holdValue = path[count];
				if( path[count] == '0' ) holdValue = 'A';
				if( path[count] == '1' ) holdValue = 'B';
				if( path[count] == '2' ) holdValue = 'C';
				if( path[count] == '3' ) holdValue = 'D';
				if( path[count] == '4' ) holdValue = 'E';
				if( path[count] == '5' ) holdValue = 'F';
				if( path[count] == '6' ) holdValue = 'G';
				if( path[count] == '7' ) holdValue = 'H';
				if( path[count] == '8' ) holdValue = 'I';
				if( path[count] == '9' ) holdValue = 'J';
				if( path[count] == 'A' ) holdValue = 'K';
				if( path[count] == 'B' ) holdValue = 'L';

				holdPath += holdValue;
				count++;
			}
		}
	holdPath+='z';

	return holdPath;
}

function rotatePls () {
	if ( $("#grid").hasClass("scrubRotate") ) {
		$("#grid").removeClass("scrubRotate");
		$("#selectMeBruv > .square").removeClass("scrubRotate");
		hideWalls( true );
		tated = false;
	}
	else {
		$("#grid").addClass("scrubRotate");
		$("#selectMeBruv > .square").addClass("scrubRotate");
		hideWalls( false );
		tated = true;
	}
}

$( document ).ready(function() {
	holdGrid = createArray(17,17);
    fillGrid();
    allowSelection();
    $("#btnToggle").click(function() {
    	showRewards++;
    	if( showRewards > 2 ) showRewards=0;
		toggleRewards();
		checkRewards();
	});
	$("#btnImport").click(function() {
		importPath( $("input").val() );
	});
	$("#btnRotate").click(function() {
		rotatePls( $("input").val() );
		checkRewards();
	});
	$("#btnPlaceLight").click(function() {
		toggleHighlight++;
		if( toggleHighlight > 2 ) toggleHighlight=0;
		lowLight();
		checkRewards();
	});

	var url = window.location.href;
	var params = url.split('?');
	if( params[1] !== undefined ) {
		if( params[1].length >= 112 ) {
			pathString = params[1];
			importPath( pathString );
		}
	}

});

////////////////////////////////////////////////////////////////
//////////// credit to /////////////////////////////////////////
/// http://gregtrowbridge.com/a-basic-pathfinding-algorithm/ ///
////////////////////////////////////////////////////////////////

var resetBoard = function( grid ) {
	for( let i = 0; i<=gridDepth*2; i++ )
		for( let j =0; j<=gridDepth*2; j++ ) {
			grid[i][j].hasBeen = false;
		}
}

var findShortestPath = function(startCoordinates, grid) {
  var distanceFromLeft = startCoordinates[0];
  var distanceFromTop = startCoordinates[1];

  resetBoard( grid );

  // Each "location" will store its coordinates
  // and the shortest path required to arrive there
  var location = {
    distanceFromLeft: distanceFromLeft,
    distanceFromTop: distanceFromTop,
    path: [],
    dist: 0,
    status: 'Start'
  };

  // Initialize the queue with the start location already inside
  var queue = [location];

  // Loop through the grid searching for the goal
  while (queue.length > 0) {
    var currentLocation = queue.shift();

   	// Explore North
    var newLocation = exploreInDirection(currentLocation, 'North', grid);
    if (newLocation.status === 'Goal') {
      return newLocation.dist;
    } else if (newLocation.status === 'Valid') {
      queue.push(newLocation);
    }

    // Explore East
    var newLocation = exploreInDirection(currentLocation, 'East', grid);
    if (newLocation.status === 'Goal') {
      return newLocation.dist;
    } else if (newLocation.status === 'Valid') {
      queue.push(newLocation);
    }

    // Explore South
    var newLocation = exploreInDirection(currentLocation, 'South', grid);
    if (newLocation.status === 'Goal') {
      return newLocation.dist;
    } else if (newLocation.status === 'Valid') {
      queue.push(newLocation);
    }

    // Explore West
    var newLocation = exploreInDirection(currentLocation, 'West', grid);
    if (newLocation.status === 'Goal') {
      return newLocation.dist;
    } else if (newLocation.status === 'Valid') {
      queue.push(newLocation);
    }
  }

  // No valid path found
  return false;
};

var locationStatus = function(location, grid) {
  var gridSize = grid.length;
  var dfl = location.distanceFromLeft;
  var dft = location.distanceFromTop;

  if (location.distanceFromTop < 0 ||
      location.distanceFromTop >= gridSize ||
      location.distanceFromLeft < 0 ||
      location.distanceFromLeft >= gridSize) {

    // location is not on the grid--return false
    return 'Invalid';
  } else if (dfl == 8 && dft == 8) {
    return 'Goal';
  } else if ( grid[dfl][dft].isEmpty !== true || grid[dfl][dft].hasBeen ) {
    // location is either an obstacle or has been visited
    return 'Blocked';
  } else {
    return 'Valid';
  }
};

var exploreInDirection = function(currentLocation, direction, grid) {
  var newPath = currentLocation.path.slice();
  newPath.push(direction);
  var travelled = currentLocation.dist+1;

  var dfl = currentLocation.distanceFromLeft;
  var dft = currentLocation.distanceFromTop;

  if (direction === 'North') {
    dft -= 1;
  } else if (direction === 'East') {
    dfl += 1;
  } else if (direction === 'South') {
    dft += 1;
  } else if (direction === 'West') {
    dfl -= 1;
  }

  var newLocation = {
    distanceFromLeft: dfl,
    distanceFromTop: dft,
    path: newPath,
    dist: travelled,
    status: 'Unknown'
  };
  newLocation.status = locationStatus(newLocation, grid);

  // If this new location is valid, mark it as 'Visited'
  if (newLocation.status === 'Valid') {
    grid[newLocation.distanceFromLeft][newLocation.distanceFromTop].hasBeen = true;
  }

  return newLocation;
};