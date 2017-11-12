<?PHP

//$myfile = fopen("./logs/experimentType.txt", "r") or die("Unable to open file!");

$experimentTypeString = "";
//$experimentTypeString = fread($myfile,filesize("./logs/experimentType.txt"));

$experimentTypeString = file_get_contents('./experimentType.txt');
echo $experimentTypeString;
//var_dump($experimentTypeString);

//fclose($myfile);
?> 