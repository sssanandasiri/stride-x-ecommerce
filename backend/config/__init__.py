# Make PyMySQL pretend to be "mysqlclient" (the driver Django looks for).
# This is what lets us use MySQL without compiling anything.
import pymysql

pymysql.version_info = (2, 2, 1, "final", 0)  # Django checks this version number
pymysql.install_as_MySQLdb()
