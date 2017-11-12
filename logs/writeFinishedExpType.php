<?PHP
$filename = $_POST["logfile"];
$blankdata = "";
file_put_contents($filename, $blankdata);
$data = $_POST["data"];
$myfile = file_put_contents($filename, $data, FILE_APPEND);
?>