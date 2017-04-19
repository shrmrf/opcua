var _ = require("lodash");
var fs = require("fs");
var xml2js = require("xml2js");

var settings = require("./settings");

// THIS file will generate the address space

var node_set =
    [
        {
            name: "Opc.Ua.NodeSet2.Part3.xml", module: "nodeset_part_3"
        },
        {
            name: "Opc.Ua.NodeSet2.Part4.xml", module: "nodeset_part_4"
        },
        {
            name: "Opc.Ua.NodeSet2.Part5.xml", module: "nodeset_part_5"
        },
        {
            name: "Opc.Ua.NodeSet2.Part8.xml", module: "nodeset_part_8"
        },
        {
            name: "Opc.Ua.NodeSet2.Part9.xml", module: "nodeset_part_9"
        },
        {
            name: "Opc.Ua.NodeSet2.Part10.xml", module: "nodeset_part_10"
        },
        {
            name: "Opc.Ua.NodeSet2.Part11.xml", module: "nodeset_part_11"
        },
        {
            name: "Opc.Ua.NodeSet2.Part12.xml", module: "nodeset_part_12"
        },
        {
            name: "Opc.Ua.NodeSet2.Part13.xml", module: "nodeset_part_13"
        },
        {
            name: "Opc.Ua.NodeSet2.Part14.xml", module: "nodeset_part_14"
        },
        {
            name: "Opc.Ua.NodeSet2.Part999.xml", module: "nodeset_part_999"
        }
    ];

///////////////////////////////////////////////////////////////////////////////
// Parse all XML inputs into data and place it on the node sets above

var parser = new xml2js.Parser();
_.each(node_set, function (ns) {
    fs.readFile(`${settings.schema_dir}/${ns.name}`, function (err, data) {
        parser.parseString(data, function (err, result) {
            ns.data = result;
            console.log("Read data");
            generate_node_set(ns);
        });
    });
});

///////////////////////////////////////////////////////////////////////////////
// All files to be created under server/src/address_space/generated/
function generate_node_set(ns) {
    var contents = `// This file was autogenerated from ${ns.name}
// DO NOT EDIT THIS FILE

use prelude::*;

`;

// Parse the xml
// Create a file with rs
//   in that file, create a populate_address_space method

    contents += "#[allow(unused_variables)]\n";
    contents += `pub fn populate_address_space(address_space: &mut AddressSpace) {\n`;

    var nodes = ns.data["UANodeSet"];
    if (_.has(nodes, "UAObject")) {
        _.each(nodes["UAObject"], function (value) {
            contents += `/*\n`;
            contents += `    UAObject { \n`;
            contents += `        display_name: "${value["DisplayName"][0]}",\n`
            if (_.has(value, "Description")) {
                contents += `        description: "${value["Description"][0]}",\n`;
            }
            if (_.has(value, "References") && _.has(value["References"], "Reference")) {
                contents += `    references: vec![\n`
                _.each(value["References"]["Reference"], function (reference) {
                    contents += `    Reference {\n`;
                    contents += `        x: \n`;
                    contents += `    }\n`;
                });
                contents += `    ],\n`
            }
            contents += ` }\n`
            contents += `*/\n`
        });
    }
    if (_.has(nodes, "UAObjectType")) {
        _.each(nodes["UAObjectType"], function (value) {
            contents += `    // UAObjectType: ${value["DisplayName"][0]}\n`;
        });
    }
    if (_.has(nodes, "UADataType")) {
        _.each(nodes["UADataType"], function (value) {
            contents += `    // UADataType: ${value["DisplayName"][0]}\n`;
        });
    }
    if (_.has(nodes, "UAReferenceType")) {
        _.each(nodes["UAReferenceType"], function (value) {
            contents += `    // UAReferenceType: ${value["DisplayName"][0]}\n`;
        });
    }
    if (_.has(nodes, "UAVariable")) {
        _.each(nodes["UAVariable"], function (value) {
            contents += `    // UAVariable: ${value["DisplayName"][0]}\n`;
        });
    }
    if (_.has(nodes, "UAVariableType")) {
        _.each(nodes["UAVariableType"], function (value) {
            contents += `    // UAVariableType: ${value["DisplayName"][0]}\n`;
        });
    }
    if (_.has(nodes, "UAMethod")) {
        _.each(nodes["UAMethod"], function (value) {
            contents += `    // UAMethod: ${value["DisplayName"][0]}\n`;
        });
    }
    // <UAObject NodeId="i=83" BrowseName="ExposesItsArray" SymbolicName="ModellingRule_ExposesItsArray">
    //   <DisplayName>ExposesItsArray</DisplayName>
    //   <Description>Specifies that an instance appears for each element of the containing array variable.</Description>
    //   <References>
    //     <Reference ReferenceType="HasProperty">i=114</Reference>
    //     <Reference ReferenceType="HasTypeDefinition">i=77</Reference>
    //   </References>
    // </UAObject>

    // UADataType
    //   <DisplayName>Integer</DisplayName>
    //   <Description>Describes a value that can have any integer DataType.</Description>
    //   <References>
    //     <Reference ReferenceType="HasSubtype" IsForward="false">i=26</Reference>
    //   </References>

    // <UAReferenceType NodeId="i=51" BrowseName="FromState">
    //   <DisplayName>FromState</DisplayName>
    //   <Description>The type for a reference to the state before a transition.</Description>
    //   <References>
    //     <Reference ReferenceType="HasSubtype" IsForward="false">i=32</Reference>
    //   </References>
    //   <InverseName>ToTransition</InverseName>
    // </UAReferenceType>

    // <UAVariableType NodeId="i=62" BrowseName="BaseVariableType" IsAbstract="true" ValueRank="-2">
    //   <DisplayName>BaseVariableType</DisplayName>
    //   <Description>The abstract base type for all variable nodes.</Description>
    //   <References/>
    // </UAVariableType>

    // <UAObjectType NodeId="i=61" BrowseName="FolderType">
    //   <DisplayName>FolderType</DisplayName>
    //   <Description>The type for objects that organize other nodes.</Description>
    //   <References>
    //     <Reference ReferenceType="HasSubtype" IsForward="false">i=58</Reference>
    //   </References>


//   in the populate_address_space method add nodes

    contents += `}\n`;

    settings.write_to_file(`${settings.rs_address_space_dir}/${ns.module}.rs`, contents);
}

///////////////////////////////////////////////////////////////////////////////
// Create the mod.rs

var mod_contents = `// This file was autogenerated
// DO NOT EDIT THIS FILE

use prelude::*;

`;

// use each part
_.each(node_set, function (ns) {
    mod_contents += `mod ${ns.module};\n`
});
mod_contents += `\n`;

// in a populate_address_space method
mod_contents += `/// Populates the address space with all defined node sets
pub fn populate_address_space(address_space: &mut AddressSpace) {\n`;

_.each(node_set, function (ns) {
    mod_contents += `    ${ns.module}::populate_address_space(address_space);\n`
});

mod_contents += `}\n`;

settings.write_to_file(`${settings.rs_address_space_dir}/mod.rs`, mod_contents);


function process_datatype(x) {

}

function process_variable(y) {

}