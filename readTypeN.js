function readType()
{
    var xmlhttp = new XMLHttpRequest();
    var returnval = "";
    xmlhttp.onreadystatechange=function(){  
        if(xmlhttp.readyState==4 && xmlhttp.status==200){
            returnval=this.responseText;
            return returnval;
        }else{
            return "filenotread";
        }
    }

    //var path="http://prime.cs.vu.nl/logs/readType.php";
    xmlhttp.open("GET", "./logs/readTypeN.php", false);
    xmlhttp.send();
    return xmlhttp.onreadystatechange();
    //console.log(animationTypeString);
}
function writeCompletedExpType(expTypeCompleteText)
{
	var filename = "./experimentTypeN.txt";
    var fd = new FormData();
	fd.append('data', expTypeCompleteText);
    fd.append('logfile', filename);
	//fd.append('tstamp', timestamp);
	
	var xhrForm = new XMLHttpRequest();

	//var path = "http://www.aysolmaz.com/prime/logs/log.php";
    var path = "http://prime.cs.vu.nl/logs/writeFinishedExpType.php";
	xhrForm.open("POST", path, false);

	xhrForm.send(fd); 
	//alert('done');
}