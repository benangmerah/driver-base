# benangmerah-driver-base

This module exports a class, BmDriverBase, which servers as the base API for
BenangMerah drivers. Drivers are classes which are used to feed linked data
into BenangMerah from a particular type of source, such as IATI datasources
or CKAN endpoints. An instance of a driver class would be used for an instance
of the type of source, for example a single CKAN endpoint.

For more information, read the annotated [source file](BmDriverBase.js).