/**
 * <home-globe>, the puzzle version: the globe of globe.js, lit by the sun,
 * with the land as a puzzle, one piece per country, and nothing else: the cuts
 * between the pieces (the borders, each with a knob), and the coast around them, are drawn in relief, a line of light
 * towards the sun and a line of shade away from it, so the pieces stand a
 * little proud of the paper. No fill on the land, nothing on the sea, and the
 * globe's one light at the reader's place. One of the three visuals of the
 * home's <home-light>; a drop-in for globe.js (same tag, attributes, `sun`
 * property and home-globe:sun event). It imports nothing and writes no style
 * (the rules are light.css). Light DOM, SVG built with createElementNS.
 *
 *   <home-globe lat="40.42" lon="-3.7" spin here glint rim></home-globe>
 *
 * lat, lon   the reader's place: where the globe faces at first and where its
 *            one light is (`here`, or `cities`: this globe lights no city but
 *            the reader's own), by day and by night
 * spin       slow rotation, only while the globe is on screen and the reader
 *            has not asked for reduced motion
 * glint      the sun on the sea; rim: a lit edge. `twilight` and `torch` are
 *            accepted and ignored: there are no dots to colour or to wake
 * Property `sun`: the sun's unit vector in the Earth's frame, set by the
 * controller. Event home-globe:sun ({ x }: -1 the sun on the left, 1 on the
 * right), so the page's glow can follow it.
 *
 * Land: Natural Earth 1:110m admin-0 countries (public domain,
 * naturalearthdata.com), the coast, the borders and the countries, re-encoded by
 * scripts/globe-puzzle-data.js (its header says how; the block below is
 * written by it, never by hand).
 */

// luz:puzzle-data:start
const QX = 1200, QY = 600;
const ARCS = "J0qCkPCACBBDDADAAECCEAHzqCIAB8qCBDBBEKC_qCAI2tBsCDHADEBAFADELCAC9LwGACK_V4FBARKLCDGCEHEBGHEAEgFlCiDMAMDGAOEKAKCKCGBEACEEAMFIECFICCCIAKDaDGCIDHDMASAGCGDICHEECOAMDIAMDKCKABEGCMDAFEGEAEGPICGIGIBGBKHFDMAAHKGIDBFGDGEGGAIUBIBADDDEDABNFHAHCBDHHHDJBDBBDFBJDFHBFBHKAGLKCMBIDEBIBIDSABFCFGHKFECEGDKDEKEIEEEAGFGHEIIBGBKECSDGCOFCBMAAFCHGBEDKEIIECEFQPBDIDGDMBEBCFGACBAHHFLBHFLANCPBFDHBJJHFGCKIOGKAGDFDELIDMCGIAFGBHDPDFBHFDABGMGJAHBFvD0DGEIAHFFCHcmCHCEEQAMDABXAFDnCECEBDDDEG3C2CDBRCECKCIDEBQPCMAEBGTKIDJDFCDGMAT6BdbCDIFCNCHCECMAIBOAEDMDSAKAaAIDNDHChBBF5EaKBPDHCOEECEIBRBKEcyL3FHJECEBBBGBCCIBBDEAEHDDHACGBAHFDAGEHCTAACECBCEEIKEEGCCBR9F8CQDADGCEDFBJCDEFDJDBEJAGCEMEACDGAiCiBwBIEODKDABMCIFQBGBGFLDODMBKFKABDLHHCJGJAADGDMDEHBDHCPEQHADRENEHCCCRIABTBFCEGaABCEEIGDGJENCEAHGJCDBLBXCZEDCGCJABIGGGCSCFDGDGESEKHADMCKnDMOAMBJFHAFFHADGEGGCH9FOaIUCBFXDJBJCI_BzEGABFGFDAJIAGEBH0FoFgBBIFVCPAICJEN3DrGBBLEBCFCACHCBEMBGAGFGBCDNOsFKBQAODXFJFABPDDEPEOMFEWAT8CKMABFXAPDJABCOEdBHCIGGCUBMDKAHGGCGAGFkBIRIDGJWHABJAEDBBXETDdBDEHCFAHEOCKAICLAXADCQEJALCKGSEGABDOCKBICGBEFECDIMANoBDFGGCIBMCCBFDKBAFLBbIACOBFnBGOAFDJECAJ2BWEDBHRAAELAAEIAUEMQaYEIDWBOHVFZAFEGENAJEEElBeIeCKEQDEEWCqBAwBAaDnBFQAbFJFRBTBKDRDJFKBRDPCTBVCBEMABGWDJGJAQECCLIYBKClBALENGIsD_CDBHAACCEGCGBBDIrEOEDDBHCFAJCMGMDH0GjECCIBIDDAHCFCHERCDKAFDHEBCECoCVNCBHBNDDFADCDEANBFBFBKCCBHBFAAFFDDEEHFHCEDEBEABCFAFCACHFFFBDDDADDHFFFBFEJEDADCFAHBDFAACBCHMACAEAEFGBAHBDEDAHAFAHACBAFBCDBDADEFAFAJBFDFDDBBDCHABajEsBBEDEDAACDCBAFCBEHIDIHKBGDCCGAGBGCGCMBIDKCAKBCFCCBKH5G_FEDDBDAAEAEEBEDEBABCEBBFEEHCCBBAACEHEBBBCEAGvB-HGAABDBHEGAG4CPIBLFDCBEKCjD4ETJEBGHGDGPAHCNGREJALEHCHBCDLBNDAECGICBCHDFDHDEDFDNFBBJDBBHDDATFJBBCOEIEICCCKEGECEEEHBBCDBDCBBDEFBDAAGDCHBJGAEFCEEEECCKAGEGAECDEECLBBBDCJAJCBCHEYGEAADOAFEHEJGJCEEMAICCEGCUEGAKEKBGBCAMABBMAGAOBSBICSDHrGlBIBMBFBHCHACER2uBzECEBEHCBGDCACGBAGGAGAAGAEHADCHDFAdkTnKMDMDIFCDKDCDFACFGDEFEAADEABBIBBBDBBCLCHIDGJEDBDBAFFBBAHCKuCkBCBADBBBGFGFCCCIFEBSJNFDDAJECCGBCCCCCBEAEEAEEACAADBDDBBAIYCEFEBBBDCBEBGCBiB7CXFEFCBBHACGECBGBGNGDAJGBBDBAGFEICEAACJADEFABEKCCCMDABCJIDEGIEGAKDIBGpDrBDFFBAECEICG8BOAGCECBADDDarDqCDFEFADIFHABFAFFDBFBJACHDBEFCBCHDDEDAFAAKDCBEBGCGEGIiEfIBCFFEDAJACEIAGPHDCBCGCCDBBNGoBCDEAABAFDAADCDBABEBIAGCCrBfHIAGEDHFAFAJAFABFGFEEMCADDCBDFBGJABGHADDBDCEGFBBCACDEAGDBAPDBBCCGBGBABGCECECMCCGEGBIAGRpCHEGCGDBBBAJGMGAGCBDJBHCACECEBJTAEACBLBDACEEACCCBV_BOADMACCMBEDKBIDHBHCLAFCHCFCBBLCBEFAGGIAIBgBbiBADEDEAEDBHALHAFGHGBEFGDEDKFGDKFEDGFEFIACOBGFIFGHIAGDEFEDBDEDCAHhkB1KGHIFKABDHABCmB4BsEADIFADEBADFHJDNBHCCDBFCDDBHAFCBBAFGBCCCDFBDDBFBDFADDBDGFGABFHDDHFDBBCHEDDCPMRBBFBHADCHANIJIGBKDIBECCGGCEAlBACFAHDBFJCHEHEBECEDEAMCGIGJCGECMIBEOFCBJDCEWEEBGAICAEMEKEKBKCGAIEIAMEeAKBKCoRyCACQ0HyDKCCCCAAJBBAFHPFJFHHHFFJFFFHHBFIAAFBBBBBADBBBDBDGPyFCFBBCFCHGDN9WADCHABBDCACMBCCDEACDACCKAPAAGAGBABEAABEACBBBDADADADABDBCLwiBkNOCMDQFBFNARALEFEHCSEG8BLQDBBlBBOIKAJwHTSAYDFFXALALECEKCH-BFQBFBLALECCMBF3BLGCKAKDZCG5TwBkBCKBZDDEPADlFvFAEKCX2G8DQGBCmBIWCMCMAGBFBrBFTFTNAFODDBVCBCLCAEGCAEMEFCW0SlEEFBFEHGLJCDHGHADDEDFBGAGAICEAKDGAKGCBEEAADHvTvBDDFBFFGFBFIHK5BMHGHCFEGAEGBCIEACFBDjCyCIEFE3HU8BGCMDSBYHGBADHDJBdGDBKDAJODCCDEECQDGCDEOIGBIBCGDECEDESDEBHBADEBMCAEmBKGBHDIAGCMAKEIDIEHEECUBIBYHGEHEHCCCDIMGGGEASACDHFGBCDBJIDDDLJGAECGCCCGEDEEEHABEGGHGMEBGGDBFIBDGMCOAMDFGBGMCQAOADEIEGAOESCCASCEBQEMAIGQCMBJBQAADICSAQDEBADZFDBSBGCCFOEWBCBcBAGYBMDCDDBIFMBGGKBMCMBGCKBDGIE8BDGDSFaCOBGBBFIBKCMAMAMAMFICDECEWBOASD1qCBQFSFADEBBGSBOFHDJAAFJBDCJCAEHAHABCACHAEDDBgrCAHDJAGBIHBDLARDFATJBBJERFBEFDJCBFHFABIBAJHABFCBJDDHJABHHFDEFaEIGEAEKCMIMGMGEKHBDFPFFIRBPLGDZBAEJCHDTCVBvBdMACDIBEEGAKHAFDFBHBLJHBFVRJDDADCJDABI3gCiGGCKBHDHA4qCAAC3qCCL6sBrFCBICBDHAHDDCCCHCIEBAErX_DIAHBACFICEBAFBEBEIDLCAEFADBABEBCAEKyDhQIEGBEEGDBBJBBCFBDCP8PubOCeHRBBFFADFHANEGCJCNGDGSCMBUZrEDENHJAHCBIBQGESGMGcWeOOCMAKGMAMAUDHBIDJZmCJDRATARGUCKBGCeDGRNNDLCAEOCMDoD7OeWEYAICYC2BBqBDND7BAaAUBOCEDFBQCgBCUBEBjBHNHAHIDTDMBCFHAIFNBIBBBTBKDABNCDBKBIDCDJBNGCDHDcAjBLTBHAFBJHNDXDFDADBDLFEFHLHAJGNAFEDGLIDEAGJGCGDCGIKCEIPDHCBEEEUBRGFAFCIGROHCAERENAhBATGSCMAbCNCACyBICCRCGCiBGDEkBCWAGBSEoBFPEACGkYpbEBGBBDJACIG2LoIACMCCABBLDbnTzDAFBDBDFDHLLJDDHBDAABDADAFAHAFBFBDBDADCDEAEBECCAEDIJOczXqLBFBDALCHCDEFCDCBIBCDGCGCICECCEAGCCECICKACBADDBBFCADHBC_BZbHIDCFCDADBDBJEFCDCHCHGDAFCBCHEDICGBEBGFGHGBEFCBCCEHGBEDAFIACDEBGACFCFCABCHKLCDEDEDCFEFADEAEFDDBEDEHEAGAEHEHCDEEACEACDGDCHMBGIoN5NBDHDFCBAFCFADE3BuB-HCACDELCACFFDCBMBAFGEIBKDEDBDICODKAKDIHEBGAEBCLBLDDHJFHDDBBBDALBPBBBHFJAFFDBDHAJBDBHBHFFFAFADAFBDDBHLFFDBDHDDTxDoDFEACNGLIDEDGCCFIFMFODEBEDEFECCBGCGEEMKgBACCAAECCCAGIBCAEAGAGDENEKEAEEEAAIEEEACCEBIGECEBBBRrBdBCAEACFEBABBDBABCDBBDAAEDAACFCDBKEKCDEACBCCICCCEAGBEDHlBDDEACHGBBDEAGDOBCBGFFVKDEBCFGCAJcOADBBBFCFBAADBBCDCXODEJBOECIACAEAEAEAGDCBEfJABDAJECIOEBDLLHAFEEacABBLBDf0DbABDACBADBDCFCACGBCAGICACCECFEAGDABGAGAEBGAECQCFBCDGAEDCDCAEBGAAEBEFABCAIFFAAIBACGAGBEAAIBGFCBFqMoIFDNCJBADOfGCECMFIFEJCAEICMBBIGDOGCGGAHqB3BECCDBFDCBECCMxSxJEEBEBDDECABGCCCECEAEIEG0CyDEBABJAAEGAJrCAGBEBDABBDCDCACEAgBdeKAGBEBGAMHGBABEAGBBBHBDCJBEEBCDADCAEDAFCBAJCBCCAFCHFFAECACGEIAMwU3KDEBGDKBKAIAEDEBEFOFGAEF9FuGBGDCECEICBZAGICUAECCAGBKCEBEDCCkEhDFBJsBHFBBADBDADEBGFEJAFuBZCEDEBCDGCrBIDAFAALDDBFBFCFAAFALALFBCFjBeFGDCAEBCEAADCDADGG8BzBBAFCFGFCDGEAAFCDEBICoF9CFIFAAFGFGDGGODAABCCIasGzCCDAFAFAJCDDJDDNFHFBBFDBBADCFCFCABFABCBBBBDNFBBCBBDCnEsEBENBxCAEAGEKCIGICIBCDICEDMBEACDyE4HEGCGDAACGEEpB6C5JEFAHCDBDBEABAFBDAFJdDHBHFBFBHEBCAGDGAECGCAAEEEAEBIAGCEAEEAGCCAEEGECEACCAEEAECECDC5NsFACPoF8EIEEBADGEABDDABCBAFDDABEACDCBM5COGEICECGCMCKAEBGEGAEBEACyFxBBAFwDhBCBECKBOOCCBAFHlBAAECECACBADBDDVkBADCFCCKDAV4BhBCDEBKBGJBFDBBDDABDCDDBDBBDDADBADBBDCDBDADU-BCCADFiX1IEDBABCACFBCBGEBCDDAE_MuFFABEDIOAAFCFACGFABHDPADEACFCFEDEBCBHLCDCACHIADBEEKRAABGCEBEAIBCBIBKBELHHCCKBGDIACDADGQoDGHFFFBDMPGDEFCLALFDHDDFHFDECEDEIwF0GBAFDAFFDHBADGDFNFHABCEIHENcHGHCDAHDDFBDBFABCCGDGGCDGlB3HnDBDDAHAAFDDHDHHFDFDADJDBABFCNDFAJDBBDCBFBBDDBFGFQDIDOFIDWAIBGJDDCHICCBCHGIiFTBEBGBEFAABBDHCHrEKDCBEFGLBJAJAOxBwCBECIFCCEDAAGIBEEDEBCFAAFBEHXVCFGAEDKBKCCCPyBvCTCHCBIDADAHDHCFGFCDGFIDADCBBDzCeAGACSvCqGLBFDADXLDJEDIDFFHBBLDFHADDHABGFGDKG0FtCDADBHBDBADGLCJCAEHBBDDDGnD4BECUGGBABIAEiC7BABFABHCvBsCBGHAAAEEEGEGFEACGIAAAEBBDCAEQEIBGAFrEnBGCCBEEBGIKAABGBABICECGDEBEgDhCDDBDCDJJrBBBJBACHCCCEBEAKAVBkBHAHAEDFBDEBBCDEBBBGFABFACBDBCFDAFEDKFGACdqDZBEECDAFCFDJBDEHABBDBFEHADIDCCGDEIGKACEOAIEICKAMDKDICGAICH7CECBGBBBHAHFBEFnBHDEBECGACIHEJEFCDEBGDCBDBGCrCkBGCFAAECGKICGAM_CrDBBDADACGAEDABCCECECGBIIAAAEBCIGIBKAIAQARgBFADFFHABBDDBFCDDBAFFADFPAFDDADGFCIIwDCFFFLDHCEGBIOIIkkB7PIHBBHGJIACCAKFFZmCCBDABEEBHBGBBDGBECAEDCDFFBFABEGACDGHMCBFCFECCIFFPICBDABEEBfkE9GFHFBDCEGBEHCCEECAEAEBGHKDEEAEDEBCFEFCECBCDEBEBEEEBBFBDDCBBAFXvBVIGEGCCCCEECFGECFHHBDCBFADBFLJDFADCFABCEGIGKEPzESEACHDBAFBCDDFADGBEDGACGAGBICvFvE6BFDFBDFJAFAHADDBAHDHAHEDCAEEACKAEDGBEAEBGBCBGDGACCBBGGFAEFKAECEAECECDCEGCCEGCEAGCEAECCAICEECECCCGEGCFECBECCCACEEGECACCBACICEDEDIABEEGCAACCEECEAGCACFCECEBEBGBCAEBECEAEBFFBACDFFCBEDGBIFGBABGBGCCGCKAIAKEICCCBADEHCFCDECGFBBCJCACFADCDIDIFABEDCFCAEBCFIHGDAFAHEFAFDHADADDHDBFHBFBDBDAHDBHAFBFFJEAEBBFDJCJCDEDKBCHACEAEDDFBEEAEEEBEDFDBDDDCAEDEDECAJEDAFELAPFHCKlJoIBFBBFBDGAICMEDEDEHK4FoCFCAGECGCEACBBDBDFBzBiDwEHBFBFBCCAEEEDCDBHDDDHABDEDEBABGBIEGBEAADHBDDFBDFIBCHEFEDAFDBCDEBBJDAJPFHJFJFFADDDCDBHDHBBFDABECCHCDAJ8CSDJDFBGBGEGGEEBBDjBvWuEDAFBADCDGDEDGFGAADKDGBADDCFCBDEDABDBBDDBCGCCFGBCBCDCDCDCFCJIBGHEHDBAKwBlBGABDABBDDCNECEIAGAKnBSECEDBHBADBBCAIBEEBLB-CBEAGCEGCICAFCBBBFDCDGQICDDDFEBCKCEjEFGAGDDDpBWDAEDEHCBCCCBCDDAIDCEIEEOAHFOAADFFGBGHGAGLIABDDBEDFDJAJBDCDDFCDBDAKIGALCBCICDECEKASrC4CBFIDJDXFbCGENCMCACNCEEKAKDKEKBKEMAHkNlFGHGBFABHBBABEvBUAEBEJGG8QtGDGGACBBFBCMMRACCEEABDGGBFBBBDBBDECCYYJCHBFDGBBCFBBHEBECEDCBBDADDBCEGIECDECCEEAAGGDAFJzBGHFCEGEEGCGCFDDDDgBa8BBDCDAFDBBFCDEBCCIDADCBABFCBEBBDEFBDCAECABCABDEACAICDAMCGEAEBEAIBtBBEEBEAADBBDBAGNWGCHDCCFDBAEBABEEAACDGGACBR7EnBGFEDBHCFCBCFABDAFGHEAEDEBGBEAEAEHgCdEBGAAGECIAIKLIGEEEGCAEDABKDABDAADDBDXCCCGEBlVsIOgDkDLBLBLBDEFCCIDGEEGEOGGCBCHEHgD_JEHCFEDIFKJEBkByUyFFHAFBFADBDJBLBHFFCAELAFDHAGFDJDDDECGDCDEICCEIEEEOCGBIMEBOIEIBIEEGCEJADPSgBECCHJBFFJEDFFABGEEGCCICGIHKBMxClCEEEBCEGBABDDBCDBBDDCAESvQvDDBBFFBLDFDDADDDAHBDDFADABEAEBGBGCEHkByCEFCACDEBAFEFCEBCBT5B1BDGACDCDGBGDEBCFGAIDIBCDCBGDEBGHKDAEIKtRrWMCUFEJLBjBDPAHGUEQKH1DPeAIGGDDFbALEPxB8BMCCCAIEEGAEBILBHPBHACENBFEICI9FDECaBGAEDDCZBJEHnELCEQDICJDHAHCEdCECSDVCHzHhBECOAKDCDLARGmJrDnBGEUAMDKESAUD8BFUCsBfkBiBCCvBCXEEMZGgBAKBWEEGRCnBCRIBIKDWCEBMAYGKAAIIAEBSESAYEKAKAKASASAmBAOCKAOCMFGCIBQDSCeBCCHGHADCDIOBKAOBCBKAaCGBKCGEEBQBGBQAIBIEIBIAMDICOCaEKCCGHKAGGIBGMGKECEIEGAECKCKEEAEBBBJDJCLFBFEBJBLFBDGDKDMLAFGHBDHDHBHDJBZDDBrBBCBKBKDFBLCJBAFSHOAiBFgBBYFKDeGaEQAeDOGSAgCGHInBBAIYEWGWEUAiBIMECCHCIEOEMEIEIACBIAEGIBCBIAQCIACDICWEUEECEBICIFICKEIACDGEWAQBGDICWAOCGCOCECIGGBKDGAKDGCCEOCOCQGGBKEMCCCKEOCMBGBABKDIBKDGAMESBOAEHADLDADIAHHOBICGEIEEGaCKIMEMEGAOAGAGCCEGDMBGAYAEBUCGAWKIBOFMAOCKEOAEAIDIAMDQAKEGAMAMAMBOEOAMACGEBGHGAmBAQAEBABEBODYDIAECSDQBCBODGBYAOBUDNNHALDNHDDAFIHMAEDVBNALLaJiBFEBYDUAaB_qCAFqsB-YCCEAGCDDFAAFDDCACCAbrK7CAEECCEACCEEECCCEACCGECEGECGCGECCGGBIEKEEMGGKGAEBGAKBL2FXIAQDIEGAGACDACGBGACCPELBBAFDDFGDKABCFEHGJEHGFBBADKHRpFqCIBECEBKBCFQDIDGEBGCCGEEAIACDMBCBF4D9DABABDBEBHAAGFEAGCGAMEEACjGsGHEF1QzGGAADFBAG";
const BORDERS = "EysBySaNADKHIGjBDDHDDABBFAHCFAEAABIDGFADAAHEFCGAABIDEBEAEAGEAACAIIBGEAACAAEDEEAAECGAOAC7I-FABJAAAJVAAPFABDCJZABBNACQCEECKIIEICACGGAGACAEAAENrZ2FECAELGLMJGDCFBFDJIHCFAA-BkBsPjFDEAKBCFBBCDDFHDBABXAJFBDLADACDHDHAHDDCEGCEBMHEBEFAACXKHBHCDBHEJADGBD3FASqF5EBAJEDIDEFIDCFADDHEDGJILAADRAZICCPBMyqBwDDDFAAHDBNCDLDBLBGLFBCDLAAFCBCVABAJCDAADLCDBABRAADBJDBDBABCJAAGDAAGHGJBHAFGRIRDCXGAADADEFCHBBBxBVgBDAAEDEDAFEEGBCGGGDAGOGKAYFGCMAIDCCIACEJEGEBCICFEECYCECQCGEMBCHICIBADGAQIBBIFQPECIDKCEACDGBCBIAEDIrDtBCAFFEBGCIDJDDAKAADCCEJBFHDABDEACFDFCAAHCPAAAEJCFELIDGBCFBDCAGJEDDFDABFAC2RvKAqBCpDpBABOlDsCAFEBGAEAEECAGBGCEICECGIAGADvmBpMLAAQFqC0EDLAFBBADrBjC5DFAPCBEAEDABCBIGCCEAECGCIAEECBCBCCCDCBIECBIEMECBIAGEEAGEGAGBCBKEIAGCGEGEEBECCAKIECGBCHAAGGIBEDEGIAABMAAMLGAIFGBCBFJGBIBECGECGHAAECCDAFJFHFHJIvC0CEDADEDBFEHCHEADVeECCCU8U-BBCHBBABFCBBNGDCAAFFADGFCACDBFCBCHAACBCTAADAHBAIBCAEAEBEAEHACCHBDFBCHBDGDIRAHADACCECCPAACACCEAEDIKAGEGCEEECGAECGCICENAAAECEECKFKBCEEAGEEBGEIBCAGAAEDEBICCBGDIAAAHCBDDDFBFABADEAABBADBDDAACDAHEyCSDGAYGIGAAACGAGGIASUDAAIKAMGjDxCAGGICEDMDECAAKIMAACAADEBEAIFEAGBCEGCCBGAGzDcHGACCGDEBCMAABEAEBCBACGACCCBCGIGABaEAAAEIAAMCAAwCAHKZDDDABBAFDJABIAAAFBFDDDHDBBFAFZAAAGBEBEBECGDAABDACBADDDBDDBFEFFHAACJADGDBBBBFDBEDNLUDADDDFFDFABAABFFHBDCABFALAAACBGDCBEACEAGADGAKDEOAACCDCAEDCEIIGAKCOCCBCACDCAKDAAGE0BZE7TCAFBBCDD2TyHLAHADKGKBADCwWvCBAfAAAEEACIBGGCIBEICGCEEGJBFDJADGHGJCDGHOFCJCJAHADDCBADBBFFADJDHCbAAHAHCJDHAFBHAFADEHEFANBJCBGNCFCHFCDFDJCFADCHAFCJBLFFBCAADAFhIxBFDBADEBCIAADABEHADAJENCBARLYCCCCGCCCBEEEJCDADEFBHEBEFACEDCNAIAADGIACCFCFIAEREDAABIDCFAACCBGGEBALCIUMCEJECEFEGGHIGGJEAECAASEEO9ECCIBCBKrB8EEGJCJBBFHBFCHBHEDBQAADABDLCBDFALLJJCBBDFCDHAHEDBHHHIiBlSECCBCBIBCAGEAYRAACAEFADCBEAGECEECGDEAGCAGEAEGGGKEDAAGAGAEAAENAHABHAAFABDABEDEACECAAEAJXPDEFDDFGDCCECEEBCEtY-JBABDBBJAALAABDAIFBBHABFAFImHpJECGFEAMHEDDDCDMH2BCIAEBCFBAIBCDCDAFAAKBEcAACAAECEAEAEDCBECENABICABIDCDABCDCDCFAHGAGACAEHADBFDBBHATAADABAAKFDFABEDACEDEDGCCACECAECEIGGCGAOAAESBGBCAGCACCDCAEOACCCBADCARAAEDGCACICACGCACFABEAGACKBCAMECCACPAACACAADCACDBBBFCFEDEAACGCCAGAFAACAAEGAEAIAAEBCCCBEACCCGEGIrBhFACFCFCLBDFADBHJtBeEIBGACACCEAKCCFKNnC0BCDBBABGACDEEAEGGICGICEAEOAACCEDCBCBEHGAECCBEAGBFFCBEBGjBaFEBAFADEFEGGmBCECBCCBEACWoBUDABDDDAFBBCBEFADCDICEBGFKCEBDFADCDCDDDEDCFErDuBCGAECAGVKCAEACAEBCALXOECAECACCCBEECCEAGCCAFfJCCDCBBFEDAACEGECLLEEDCWALCAIiGxBFDABCDFBABBBGFIYGBFDBADCFCACDEFGQaDFCDCDBFBBF2M6JCBKBDDADHAAFBCAFDADECCDGAACDDBCDEBABGdHHBHEBBLCBEGcyBCBCAIFECGDCAAEAI6E9ODEFABIBAHIDEBGIAAMBEEGGCAAEECGAMAAABGAEBEBCBAHADAFABDHFHJrCRAUIAAYEAKCEBECGCI5CCIEEBEBcAEBQBMEEAAGAEAEBH1IiHCCEAEACAIDIHEAACHCBCFEAAHADCDADAALAHBKAGGAGCEBECBCDBBCDBHAKeIEAAECAEBIEcAAEH6BMAGAAsBbCDGBCDGAIAAAPDDADFBHADBDAOAADABAJBADFBDDBCBBBDDFABBBADGAADBBCBABBHALAABCACBACEDGBAFDFEBBACCSkDaPGsB9DBGCOBGDEAEFAACACCCCCCEAACCCAGDGAACFBDDHBDANCuCsBBBSAAFGFDFCBCFBDBDAHCDABADCFCFABBBDBBAFGJCAEHCACDGAGEacKCUOWMEAAKBEDGCPFjCEDBBFFBHBBADDBDJDBDEBBDBBBFJIuBSDHBAAJEDCFEBADEAAADJCHCEAAFBDCBACAALAI3BYDGAEAGACBKBEACCAAGAGZnBCCDGCICEAKFAABKMAGACAHjBDCBCBEBCCCAGBGhBhBCIDCDECCAGFAACECCDICCHBPBABDBCACDEBAIAABAAGDEFABABDDBFLOCCCAECAGDQlBCEGGEgGfJADBDFH6BmBEBABGFCDGBADD_ChCBCDDRFIGEDECCGAAEEDGACCAGAEDEEIBCFBBECEDXJMCAIIuEtCEBCFDHCDBDBFEBDAATDAFIvBLDEDEAWOAAEAEAGQmCDBFCHCAEBCFAHBBBDDEBECEACBCBADCCHzCBGER6EEBCEEACiBqHBBFAABAADBBEADAAABDLCAADMCGMECCAAADFCMCACBDBBDCBFAFKrFHDMDCACFEAGEECEBGCEFUZADJFAFBBQ5DRAIKGIAGCCEICAEECCCKCACBCBGAEBEMuCfCHBFAHADBBEDADCDECGDCDD-E-BIBMGCAAEHIAABANDIFDDFADFFCCsEVCBGAFDAADBBADBDEAABBTEBICBCDCEPYDABEFADAAGGEAG9BWQICIAECCEEFAAECGBEBCCNAAEHGBADDBBFGFIDCDAFCAABEDFNFLAROJEHCC8ClDHOEAAUIGMDGF8JlCBIEEKCGAEAAEDEGGDHAACDBHJDCDFBFBFPbBDDAAEFCRJWCIEGBGBGDGBCCCEGDEDGBECCEIEAECECQAACBADGABHAFGECAEACCGAEFAFGFAFBBDhBoBACGEFAACACAAGECMAAEFCFIACFDBBBIDKNGDCDBHEjDsBAGCBAEPAAECBECCAGGACEAEEGAEIEGBAECCBCOAAEACDEAALFDBHIACFEBBDIDECADJIICCMAGEEBGBBDEBGBFoEyDBBFADDBAKNOGEIEEECBGAAEKCCEEDpB7CyBHLCBECGBGCEBGDABFAJADBDFJBHDJCDDEDJFHBJAJDHBDCHAJEFAHANAHADEBGDCHERCBCCIDGJCFEAEWgB1FDMBAADDCCECAEGDCFAFABGBAFCBDEDDBABEBBDCFCDUrEKEEQABGDEAEDEGGIAIIEGGGAGGEFCDKCEMBGCGEJAAIHADCDADDCAHIDIDLAADDBFGBQHIAEDOBGAACAIDAAECAFHAAABGBECMBAGBCJAAEAGEIGGBECEDBBGBF3BFEEECIBEAKnCQEAEBIDEACDEBGBIBIAIxFRCGKEAEDAAGFEFGZAAKBIAEAACGBIEAEEEGAACGCCBCCAECEECBEGACGECBGCEQCICEAAEDCDKDPhCMCBGCCACCEACECCEAADADCDGCEEMACAACBJ_CxBGGAGFAAEBGCEBAEOKAAGBGACEEAECCGGAAEGBHeSDBFCADGAIBOAFAAAFECEBAFKkBgBBBJBBDJABDFAFAFDADLzCXAGFAHGDAHEDADBDCDDFBF9BADGCCBGECDAAGDEBCAACAHAAIGCACBBDEBCAJ1CREEAEEBGCEBGAIEKADaKDGFADAAFEBGCAAKAHAAEBBBEBBBGBAFErFqGSHCJCBH0B7CFBBDNANELAHBEAABGECBIGAAGAICCEGCBCCAAMEEKnCDCBBDCHAAEEACIAFIJGFBFAALDDCHABACAADCCAACGEAAACKIDGGFPFCHADBDCBAKAADEDAACFAABDCACDADCGAABEAEDGCABEC6BEEBCpBnBFHDAAJBFAEAAJCACLBDAAFCACIAAGAACGBECGAAEEEFAAGBGCEBIACAAADEmBADBHJFADAADADBEAABAFAHECAABCIGIGBECCAICECIBCAFoBRACAGHIBCGMdHCHBDARAACHAABEBBDCAEDAFGFGiCICMAGAKFENQGAIBGAGxCrBDAJDDACFGDDZJHCFACHMBECAACEFAABIEAEIBCDKKGAEAD4D1CFAFBGAAABFBDEFBDADAABEBCFAAAEECDCCEDWPEADFDnBHEECECAAOED8DAGCGDE_EGBCECCADAACBCBDAAAFCBDNiBEDDBJAABAJCFBBCBDGDIHGBCAABAFdUGAEAEEECInBCABDBDCBDDCDBFACHYCEERIEAICIFOlD5BECCDKCCDDBAFBDBACDBDEBDDABEA4DADADIADmExBADABGwGdCCEBEABECCFkO5HCDCCCACIDvUgJGCGEDiF1HBADAKAADGFEFCDABCDBDEBFHCNsBMCEACCECBKAIBCCCDCCGIGCSCC3DsDHAGzB3CAwBBGCEAECCJkCtFDIDCACDEDACEEAACF4BaDFADGACBGAABBEFEBUHGACdWBDDzCvCDBACGIgBCCEBGCEAECFjDwIEABDCBBDDAADBADCODGCCAAGAEFACCHEBBCAAHECIDBB";
const COUNTRIES = "AB,F;BtiBDDDDDDrhBphB;B5iBriBpiBD;BhjBriBpiBriB,Z,d,hB,lB,pB,tB,xB,1B,5B,9B,hC,lC,pC,tC,xC,1C,5C,9C,hD,lD,pD,tD,xD,1D,5D,9D,hE,lE,pE;AxE1e3e0e,1E,5E,9E,hF,lF,pF,tF,xFsd,1F;C5jB_d9dDDD;ApkBDDDK;BtkBve,hG,lG,pG;AtGge,xGhe,1G,1kB7d,9G,hH,lH,pH,tH,xH,1H,5H,9H;B5kB3c,tlBDDD7c5c;ApIwc,1lBnd0cR;A5mBDDDDDDvdtdD2D;C1IxeDD;A5IkeVDD2F;AtoBDDnflfDDD;D9oBDDDW;AhJhgB;BlJ8f;ApJ,tJ,xJ,1J,5J,9J,ppBnflf,lK,pK,5KhgBD_f9fDDDzfxfDvfsZhGDDD,9K,hL9f;AlL,pL,tL;AxL;B1L,5LtfDG,9L,hM;AlM;ApM;BwkBjY;AxMtfDDDDD,gsB;BgsB;B5MxfDvfwW;C8kB_Xxf;AhNtgBDDDDDDDiHgH;C1tBiIKtIa;B9tBDzgBwYgIa;CpuB7gB5gB7gB5gBCe;A1N5gB7gB0gB;B9N1gB3gB0gB;AlOxgBzgBwgB;BtOxgBDvgBsgB;ChvBvgBogB;A5OogBCngBxgB6C;CkvBngBod;BpvBngBofmB;CtvBngBkgBiC;DxvBngBkgBiC;BtPkgBiC,pwBDvgBtgBvgBtgBDD,5P;AguBje8d;AhQ;AlQ;ApQ;B1wBDD6E;DswBNqF;B4wBJDvgB8a;C1xB_gB9gBDDDzgB;BtyBDDDDDO;A5QsgBUZ6P;BhzBDDD3hB;A1zBDuBtBONDqK;ChR5iBOG;BkzBUziBljBDDDmL;Ax0BDjjBshB;B50BDnjBgjB;Dl1BDvjBkjBJyC;Ax1B7jB5jBDC2Ce;B5R4jB-D;Bo1BN3jBkjB;ChS0jBG;C80BCG2BUmB;C91BmOcsL9BuP;D41B2BlC_jB9jB6P;Ap2B_jB8jB-B;CtS8jB-B;C4lB9QyFOhGDuU;As2BN-U;D42BG6F-EpL-KrZkP;B82BiL;Eg2BrjBsT,5Ske4F2Q;Ch3BmQyE;A53BD3kB1kBDDD;B93B7kB0kB;AlT;Ch4BW;ApTse;Ap4B7kB5kB;CwyBS0BhFKzkB9kB6V;Bg4BS3jBplBDDuB;Cp5BDnlBllBnlB;Bt5BrlB;B15BDrlB;Cl6BOrlB5lBDDe;Bt6BD7lB4kB,xUwkB;A1U,5U;C9U9lBDD;Bl7BD7lB5lB7lBwlB;Ax7BDDCO;Co7BVDDrmB4lB;DtV1mBOW;Cp8BzmBxmBzmB8T;A5VsmB;Ct8B2S;Ap9BDDDDD3mB1mBW;Bw8BvmB0lB;Ct9BG;Cx9BS;D99BDDvnBwmB;Ct-BDOND6Z;Dg-BVDua;E8jB0aJqb;BpW1oBOiaS;AxWknBUUvoBhpBDDD-E;D04BkB5F7oBohBC;ChgCDDDK;A5WtpB-U;D1gCDDD-V;BogClBDDDDD3pB8T_ToT;C9hC2Y_R1qBDDCe;B5iCDDDDDD;CtjCqBpBDDD2B;AxjCyC;DwjCuC8BdDrsBwpB;B9jCvsB8R0YqB;ChkCvsBssBmDmW;B1XssBuZ;A9X9sB_sB9sBDD2U1U2B1BqC;CplCDDD7sB0rB;AlY,1lCDntBltBK;Bg_BYhGrtBknByF,slC7sBssB;DlmCDDntB8sB;B1mC7tB5tBDDiD;CokCuUhXqE;D9mCyWkU;ChnCjuBoX4WqC;BhZguBqC;BlZhuB;AtZ0W3W8tB;ApnC3tB;A1Z;A5Z,9Z,ha,la,pa;Ata,xa;A1a,5a;A9a;Bhb,4-BCOGiBYOMCqBOU7gBkhB2S8SySuG;Apb;A4mC6WvUhsBiF,xb,1b;B5bgpB,9b;BhcorB,lc;Apc;BxnCuHS_iBwN,0_BO;DxcopB6F0Hud;A1c,5c,9c,hd,ld,pd,td;Cxdsd,5d9pB_pBgH;A9d4pB;DsnCrpB0oBqDiB;CgrBkV_hBwM;AwhCpG-EUiC;DkkCuBkFiG;ChoCDzpB8J;Ate,xe,1e;DwtBmIoH;CloCrpBwb;AlfgpB2NiBnasava0aUmB;Apf,tf,xf,1f,5f,9f,hgB,lgB;ApoC_nB;BtgB8nB;AxgBoC0V;C5gB4W7W5nBqgB;BsoCvnBsXI6E2Ke;B5oCDS2fpgB-gBO;A0oCJ7nB8mB;DlhB4nBCyhB;ConB9hByiBxiBymB;DgpCqiBsQ2U;DtpCD6C;B1pCDqDOO;AomCgDVDCqEuBW;ChqCCO6CnlB0kB;EwpCII-D;AthB;DkpC2hBkhBigBwNuP";
// luz:puzzle-data:end

const DEG = Math.PI / 180,
  TAU = 2 * Math.PI;
const VB = 600,
  CX = 300,
  CY = 300,
  R = 272;
// eslint-disable-next-line no-restricted-syntax -- RL-12: the SVG namespace name, an identifier that is never fetched
const SVG = "http://www.w3.org/2000/svg";
const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const CODE = new Uint8Array(128);
for (let i = 0; i < 64; i++) CODE[ALPHABET.charCodeAt(i)] = i;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const q = (v) => Math.round(v * 10) / 10;
const el = (tag, attrs, parent) => {
  const n = document.createElementNS(SVG, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.append(n);
  return n;
};
const vec = (lat, lon) => [
  Math.cos(lat * DEG) * Math.sin(lon * DEG),
  Math.sin(lat * DEG),
  Math.cos(lat * DEG) * Math.cos(lon * DEG),
];

/* ---- the borders ---- */
/** Every number of a string of the alphabet (5 bits a char, the sixth: more follows) */
function ints(s) {
  const out = [];
  let n = 0,
    shift = 0;
  for (let i = 0; i < s.length; i++) {
    const c = CODE[s.charCodeAt(i)];
    n |= (c & 31) << shift;
    if (c & 32) shift += 5;
    else {
      out.push(n);
      n = shift = 0;
    }
  }
  return out;
}
const zig = (n) => (n & 1 ? -(n + 1) / 2 : n / 2);

/* The land, decoded once, the first time a globe has a size */
let topo = null;
function getTopo() {
  if (topo) return topo;
  // The coast arcs, then the borders with their knobs, in one set of points
  const coast = decodeLines(ARCS),
    { start, len, ...rest } = packLines([
      ...coast,
      ...decodeLines(BORDERS).map(knobbed),
    ]);
  // A ring: references to arcs (each from the one before), chained into one list of point indices
  const ring = (refs) => {
    const idx = [];
    let a = 0;
    for (const ref of ints(refs)) {
      a += zig(ref >> 1);
      const s = start[a],
        n = len[a];
      for (let k = 0; k < n; k++) idx.push(ref & 1 ? s + n - 1 - k : s + k);
    }
    return idx;
  };
  // The rings of each country, with its tone
  const countries = COUNTRIES.split(";").map((c) => ({
    tone: CODE[c.charCodeAt(0)],
    loops: c.slice(1).split(",").map(ring),
  }));
  return (topo = {
    ...rest,
    start,
    len,
    coast: coast.length,
    countries,
  });
}

/* The pieces: one per country. Every border between two countries is a cut
   of the puzzle, with a knob (one for every ~14 degrees of its length) out
   on one side or the other, built once in a local flat frame (longitude
   times the cosine of the latitude, latitude) around the knob */
// The knob on a chord from 0 to 1: along, and across to one side (a narrow neck, a round head)
const KNOB = [
  [0, 0],
  [0.18, 0.18],
  [-0.08, 0.42],
  [0.08, 0.68],
  [0.5, 0.78],
  [0.92, 0.68],
  [1.08, 0.42],
  [0.82, 0.18],
  [1, 0],
];
// The flat length of a segment, in degrees
const span = ([x0, y0], [x1, y1]) =>
  Math.hypot((x1 - x0) * Math.cos(((y0 + y1) / 2) * DEG), y1 - y0);
/** A line of [lon, lat, seam] points with its knobs (the a-th line: its seed);
 *  a knob that would span a seam point is left out */
function knobbed(line, a) {
  const n = line.length,
    d = [0];
  for (let k = 1; k < n; k++) d.push(d[k - 1] + span(line[k - 1], line[k]));
  const L = d[n - 1],
    knobs = L < 1.6 ? 0 : Math.max(1, Math.round(L / 14));
  if (!knobs) return line;
  // The point at distance t along the line, and the index of the point after it
  const at = (t) => {
    let k = 1;
    while (k < n - 1 && d[k] < t) k++;
    const f = (t - d[k - 1]) / (d[k] - d[k - 1] || 1);
    return [
      [
        line[k - 1][0] + (line[k][0] - line[k - 1][0]) * f,
        line[k - 1][1] + (line[k][1] - line[k - 1][1]) * f,
        0,
      ],
      k,
    ];
  };
  const w = Math.min(2.4, Math.max(0.8, (L / knobs) * 0.3)),
    out = [];
  let from = 0;
  for (let j = 0; j < knobs; j++) {
    const t = (L * (j + 0.5)) / knobs,
      side = (a * 7 + j * 3) % 2 ? 1 : -1;
    const [A, ka] = at(t - w / 2),
      [B, kb] = at(t + w / 2);
    let seam = false;
    for (let k = ka - 1; k <= kb; k++) if (line[k][2]) seam = true;
    if (seam) continue;
    for (let k = from; k < ka; k++) out.push(line[k]);
    const c = Math.cos(((A[1] + B[1]) / 2) * DEG),
      ux = (B[0] - A[0]) * c,
      uy = B[1] - A[1];
    for (const [s, h] of KNOB)
      out.push([
        A[0] + (s * ux - h * uy * side) / c,
        A[1] + s * uy + h * ux * side,
        0,
      ]);
    from = kb;
  }
  for (let k = from; k < n; k++) out.push(line[k]);
  return out;
}

/** Lines of ARCS-encoded points, as lists of [lon, lat, seam] */
function decodeLines(s) {
  const v = ints(s),
    lines = [];
  for (let i = 0, x = 0, y = 0; i < v.length; ) {
    const n = v[i++],
      line = [];
    for (let k = 0; k < n; k++) {
      x += zig(v[i++]);
      y += zig(v[i++]);
      // A point on the antimeridian or at the pole: a segment between two of them is a seam of the data, not a line to draw
      line.push([
        (x / QX) * 360 - 180,
        (y / QY) * 180 - 90,
        x === 0 || x === QX || y === 0 ? 1 : 0,
      ]);
    }
    lines.push(line);
  }
  return lines;
}

/** Lines as one set of points on the sphere, each line a run of it */
function packLines(lines) {
  const start = [],
    len = [];
  let N = 0;
  for (const line of lines) {
    start.push(N);
    len.push(line.length);
    N += line.length;
  }
  const X = new Float32Array(N),
    Y = new Float32Array(N),
    Z = new Float32Array(N),
    seam = new Uint8Array(N);
  let k = 0;
  for (const line of lines)
    for (const [lon, lat, s] of line) {
      [X[k], Y[k], Z[k]] = vec(lat, lon);
      seam[k++] = s;
    }
  return { N, X, Y, Z, seam, start, len };
}

/* ---- the horizon ---- */
// P holds, per point, its screen x and y and its depth (positive: facing us)
const cross = (P, a, b) => {
  const za = P[3 * a + 2],
    t = za / (za - P[3 * b + 2]);
  const dx = P[3 * a] + (P[3 * b] - P[3 * a]) * t - CX,
    dy = P[3 * a + 1] + (P[3 * b + 1] - P[3 * a + 1]) * t - CY;
  const s = R / (Math.hypot(dx, dy) || 1);
  return [CX + dx * s, CY + dy * s];
};
const pt = ([x, y]) => q(x) + " " + q(y);
const angle = ([x, y]) => Math.atan2(CY - y, x - CX);

/** The visible parts of a polyline of point indices, as path data (a segment between two seam points is left out) */
function strokeOf(P, indices, seam) {
  let d = "",
    on = false,
    prev = -1;
  for (const i of indices) {
    if (seam && prev >= 0 && seam[i] && seam[prev]) {
      on = false;
      prev = -1;
    }
    if (P[3 * i + 2] > 0) {
      if (on) d += "L" + q(P[3 * i]) + " " + q(P[3 * i + 1]);
      else {
        on = true;
        d +=
          (prev >= 0 ? "M" + pt(cross(P, i, prev)) + "L" : "M") +
          q(P[3 * i]) +
          " " +
          q(P[3 * i + 1]);
      }
    } else if (on) {
      on = false;
      d += "L" + pt(cross(P, prev, i));
    }
    prev = i;
  }
  return d;
}

/** The visible part of a ring (indices, closed), as filled shapes: its runs
 *  stitched along the horizon, counter-clockwise as seen (every ring of the
 *  data is counter-clockwise, so its inside stays on the left; a lake is a
 *  ring inside another, left to the even-odd rule): from where a run leaves
 *  the disc, the horizon is followed to the nearest point where a run comes
 *  back in, which may belong to another run */
function fillOf(P, indices) {
  const runs = [];
  let open = null,
    crossed = false,
    prev = -1;
  const n = indices.length;
  for (let k = 0; k <= n; k++) {
    const i = indices[k % n];
    if (P[3 * i + 2] > 0) {
      if (!open) {
        open = [];
        if (prev >= 0 && P[3 * prev + 2] <= 0) {
          open.push(cross(P, i, prev));
          crossed = true;
        }
      }
      open.push([P[3 * i], P[3 * i + 1]]);
    } else if (open) {
      open.push(cross(P, prev, i));
      crossed = true;
      runs.push(open);
      open = null;
    }
    prev = i;
  }
  if (open) {
    if (!crossed) return "M" + open.map(pt).join("L") + "Z";
    // The run that closes the ring continues the one that opened it
    runs[0] = open.concat(runs[0].slice(1));
  }
  if (!runs.length) return "";
  const entry = runs.map((run) => angle(run[0])),
    done = new Uint8Array(runs.length);
  let d = "";
  for (let first = 0; first < runs.length; first++) {
    if (done[first]) continue;
    let r = first;
    d += "M" + runs[r].map(pt).join("L");
    for (;;) {
      done[r] = 1;
      // From the end of this run, the first entry met going counter-clockwise
      const exit = angle(runs[r][runs[r].length - 1]);
      let next = -1,
        best = Infinity;
      for (let e = 0; e < runs.length; e++) {
        let span = entry[e] - exit;
        if (span <= 0) span += TAU;
        if (span < best) {
          best = span;
          next = e;
        }
      }
      const [nx, ny] = runs[next][0];
      d += `A${R} ${R} 0 ${best > Math.PI ? 1 : 0} 0 ${q(nx)} ${q(ny)}`;
      // A run already stitched (a knob that touches the horizon can lead back to one): the shape is closed
      if (next === first || done[next]) break;
      r = next;
      d += "L" + runs[r].map(pt).join("L");
    }
    d += "Z";
  }
  return d;
}

let count = 0;

class LuzGlobe extends HTMLElement {
  constructor() {
    super();
    this._raf = 0;
    this._last = 0;
    this._yaw = this._pitch = this._vyaw = this._vpitch = 0;
    this._dragging = false;
    this._sun = [0, 0, 1];
    this._sunX = NaN;
    this._seen = false;
    this._here = null;
  }

  get sun() {
    return this._sun.slice();
  }

  set sun(v) {
    if (!Array.isArray(v) || v.length !== 3 || !v.every(Number.isFinite))
      return;
    this._sun = v.slice();
    this._shadeAll();
  }

  connectedCallback() {
    if (!this._svg) this._build();
    this._read();
    this._ro = new ResizeObserver(() => this._setLod());
    this._ro.observe(this);
    this._io = new IntersectionObserver(([entry]) => {
      this._seen = entry.isIntersecting;
      this._request();
    });
    this._io.observe(this);
  }

  disconnectedCallback() {
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    this._ro.disconnect();
    this._io.disconnect();
  }

  _read() {
    const has = (a) => this.hasAttribute(a);
    this._opts = {
      here: has("here") || has("cities"),
      glint: has("glint"),
      rim: has("rim"),
      spin: has("spin"),
    };
    const lat = parseFloat(this.getAttribute("lat")),
      lon = parseFloat(this.getAttribute("lon"));
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      this._yaw = -lon * DEG;
      this._pitch = Math.max(-50, Math.min(50, lat * 0.35)) * DEG;
      this._here = vec(lat, lon);
    }
    this._hereG.style.display = this._opts.here && this._here ? "" : "none";
    this._glint.style.display = this._opts.glint ? "" : "none";
    this._rimLight.style.display = this._opts.rim ? "" : "none";
  }

  /* ---- DOM ---- */
  _build() {
    this._reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    this._reduced.addEventListener("change", () => this._request());
    // An image, not a control: its name is the aria-label the page gives it; a pointer may drag it
    if (!this.hasAttribute("role")) this.setAttribute("role", "img");
    const id = "home-globe-" + ++count;
    const halo = document.createElement("div");
    halo.className = "home-globe__halo";
    this.append(halo);
    const svg = (this._svg = el(
      "svg",
      { viewBox: `0 0 ${VB} ${VB}`, "aria-hidden": "true" },
      this
    ));
    const defs = el("defs", {}, svg);
    // In style, not in attributes: a presentation attribute takes no var()
    const stops = (grad, list) =>
      list.forEach(([offset, color, opacity]) =>
        el(
          "stop",
          { offset, style: `stop-color:${color};stop-opacity:${opacity}` },
          grad
        )
      );
    const userSpace = {
      gradientUnits: "userSpaceOnUse",
      cx: CX,
      cy: CY,
      r: 330,
    };
    this._gSun = el("radialGradient", { id: id + "-sun", ...userSpace }, defs);
    stops(this._gSun, [
      [0, "var(--_sun)", 0.7],
      [0.55, "var(--_sun)", 0.18],
      [1, "var(--_sun)", 0],
    ]);
    this._gShade = el(
      "radialGradient",
      { id: id + "-shade", ...userSpace },
      defs
    );
    stops(this._gShade, [
      [0, "var(--_shade)", "var(--_shade-opacity)"],
      [1, "var(--_shade)", 0],
    ]);
    stops(el("radialGradient", { id: id + "-glint" }, defs), [
      [0, "var(--_glint)", 0.95],
      [0.35, "var(--_sun)", 0.6],
      [1, "var(--_sun)", 0],
    ]);
    stops(el("radialGradient", { id: id + "-here" }, defs), [
      [0, "var(--_sun)", 0.85],
      [0.3, "var(--_sun)", 0.35],
      [1, "var(--_sun)", 0],
    ]);
    this._gRim = el(
      "linearGradient",
      {
        id: id + "-rim",
        gradientUnits: "userSpaceOnUse",
        x1: CX,
        y1: 28,
        x2: CX,
        y2: 572,
      },
      defs
    );
    stops(this._gRim, [
      [0, "var(--_sun)", 0.9],
      [0.45, "var(--_sun)", 0],
    ]);
    el(
      "circle",
      { cx: CX, cy: CY, r: R },
      el("clipPath", { id: id + "-disc" }, defs)
    );
    // The land: the cuts between pieces are drawn inside it only. The cuts and the
    // coast are drawn once each, in defs, and used three times: a line of
    // light, a line of shade and the cut itself
    this._clip = el(
      "path",
      { "clip-rule": "evenodd" },
      el("clipPath", { id: id + "-land" }, defs)
    );
    this._jigSrc = el("path", { id: id + "-jig" }, defs);
    this._coastSrc = el("path", { id: id + "-coast" }, defs);
    const disc = () => el("g", { "clip-path": `url(#${id}-disc)` }, svg);
    const whole = { cx: CX, cy: CY, r: R };

    el("circle", { class: "home-globe__sea", ...whole }, svg);
    // The pieces: a faint grey per country, five tones, no two neighbours alike
    this._tones = [0, 1, 2, 3, 4].map((t) =>
      el(
        "path",
        {
          class: `home-globe__piece home-globe__piece--${t}`,
          "fill-rule": "evenodd",
        },
        svg
      )
    );
    this._sunlight = el(
      "circle",
      { ...whole, fill: `url(#${id}-sun)` },
      disc()
    );
    const uses = (href, parent, cls) =>
      ["light", "shade", "line"].map((part) =>
        el("use", { href: "#" + href, class: `${cls} ${cls}--${part}` }, parent)
      );
    const inland = el("g", { "clip-path": `url(#${id}-land)` }, svg);
    this._jig = uses(id + "-jig", inland, "home-globe__jigsaw");
    this._coasts = uses(
      id + "-coast",
      el("g", { class: "home-globe__lines" }, svg),
      "home-globe__coast"
    );
    this._glint = el(
      "circle",
      {
        class: "home-globe__glint",
        r: 24,
        fill: `url(#${id}-glint)`,
        opacity: 0,
      },
      disc()
    );
    this._nightshade = el(
      "circle",
      { class: "home-globe__night", ...whole, fill: `url(#${id}-shade)` },
      disc()
    );
    // The reader's light: above the night, so it shines there too
    this._hereG = el("g", { class: "home-globe__here" }, svg);
    el("circle", { r: 14, fill: `url(#${id}-here)` }, this._hereG);
    el("circle", { class: "home-globe__here-core", r: 2.4 }, this._hereG);
    el("circle", { class: "home-globe__rim", ...whole }, svg);
    this._rimLight = el(
      "circle",
      { class: "home-globe__rim-light", ...whole, stroke: `url(#${id}-rim)` },
      svg
    );
    this._bindPointer();
  }

  /** On the first size: the land and the jigsaw; on every size: the level of detail. */
  _setLod() {
    const w = this.clientWidth;
    if (!w) return;
    if (!this._T) {
      this._T = getTopo();
      this._P = new Float32Array(this._T.N * 3);
    }
    const lod = w < 420 ? 1.9 : 1;
    this._lod = lod;
    // The cuts between pieces: a fine whole line, barely there; the coast
    // dotted (round caps on zero-length dashes)
    for (const u of this._jig)
      u.setAttribute("stroke-width", (0.4 * lod).toFixed(2));
    for (const u of this._coasts) {
      u.setAttribute("stroke-width", (0.5 * lod).toFixed(2));
      u.setAttribute("stroke-dasharray", `0 ${(1.3 * lod).toFixed(2)}`);
    }
    this._shadeAll();
  }

  /* ---- light: the sun's gradients do it; a new sun asks for a frame ---- */
  _shadeAll() {
    if (!this._T) return;
    this._dirty = true;
    // A still globe draws now, with no animation frame (reduced motion asks for none)
    if (this._raf) return;
    this._draw();
  }

  /* ---- draw ---- */
  _draw() {
    const T = this._T;
    if (!T || this.hidden) return;
    const P = this._P,
      sun = this._sun,
      opts = this._opts;
    const cy = Math.cos(this._yaw),
      sy = Math.sin(this._yaw),
      cp = Math.cos(this._pitch),
      sp = Math.sin(this._pitch);
    const project = (X, Y, Z, out) => {
      for (let k = 0; k < X.length; k++) {
        const x = X[k],
          y = Y[k],
          z = Z[k];
        const x1 = x * cy + z * sy,
          z1 = z * cy - x * sy;
        out[3 * k] = CX + R * x1;
        out[3 * k + 1] = CY - R * (y * cp - z1 * sp);
        out[3 * k + 2] = y * sp + z1 * cp;
      }
    };
    project(T.X, T.Y, T.Z, P);

    // The coast, then the cuts between pieces (the borders): every arc, once
    let coasts = "",
      jig = "";
    const idx = [];
    for (let a = 0; a < T.start.length; a++) {
      idx.length = 0;
      for (let i = T.start[a]; i < T.start[a] + T.len[a]; i++) idx.push(i);
      if (a < T.coast) coasts += strokeOf(P, idx, T.seam);
      else jig += strokeOf(P, idx);
    }
    this._coastSrc.setAttribute("d", coasts);
    this._jigSrc.setAttribute("d", jig);

    // The pieces: each country filled with its tone, one path per tone; all
    // of them, the land, are the clip of the cuts
    const tones = this._tones.map(() => "");
    for (const { tone, loops } of T.countries)
      for (const loop of loops) tones[tone] += fillOf(P, loop);
    this._tones.forEach((path, t) => path.setAttribute("d", tones[t]));
    this._clip.setAttribute("d", tones.join(""));

    // The sun in view space
    const sx1 = sun[0] * cy + sun[2] * sy,
      sz1 = sun[2] * cy - sun[0] * sy;
    const sz2 = sun[1] * sp + sz1 * cp,
      sy2 = sun[1] * cp - sz1 * sp;
    this._gSun.setAttribute("cx", q(CX + R * sx1 * 1.1));
    this._gSun.setAttribute("cy", q(CY - R * sy2 * 1.1));
    this._sunlight.setAttribute(
      "opacity",
      clamp01((sz2 + 0.35) / 0.7).toFixed(2)
    );
    this._gShade.setAttribute("cx", q(CX - R * sx1 * 1.1));
    this._gShade.setAttribute("cy", q(CY + R * sy2 * 1.1));
    this._nightshade.setAttribute(
      "opacity",
      clamp01((-sz2 + 0.35) / 0.7).toFixed(2)
    );
    // The relief of the cuts: the light towards the sun, the shade away from it (from the top left when the sun is behind)
    const sl = Math.hypot(sx1, sy2),
      lit = sl > 0.2 && sz2 > -0.3,
      ux = lit ? sx1 / sl : -0.7,
      uy = lit ? -sy2 / sl : -0.7,
      off = 0.55 * this._lod;
    for (const [light, shade] of [this._jig, this._coasts]) {
      light.setAttribute(
        "transform",
        `translate(${q(ux * off)} ${q(uy * off)})`
      );
      shade.setAttribute(
        "transform",
        `translate(${q(-ux * off)} ${q(-uy * off)})`
      );
    }
    if (Number.isNaN(this._sunX) || Math.abs(sx1 - this._sunX) > 0.015) {
      this._sunX = sx1;
      this.dispatchEvent(
        new CustomEvent("home-globe:sun", { bubbles: true, detail: { x: sx1 } })
      );
    }
    if (opts.glint) {
      this._glint.setAttribute(
        "transform",
        `translate(${q(CX + R * sx1)} ${q(CY - R * sy2)})`
      );
      this._glint.setAttribute(
        "opacity",
        (clamp01((sz2 - 0.2) / 0.6) * 0.6).toFixed(2)
      );
    }
    if (opts.rim) {
      const sl = Math.hypot(sx1, sy2) || 1,
        ux = sx1 / sl,
        uy = sy2 / sl;
      this._gRim.setAttribute("x1", q(CX + R * ux));
      this._gRim.setAttribute("y1", q(CY - R * uy));
      this._gRim.setAttribute("x2", q(CX - R * ux));
      this._gRim.setAttribute("y2", q(CY + R * uy));
      this._rimLight.setAttribute(
        "opacity",
        (0.35 + 0.65 * clamp01(-sz2)).toFixed(2)
      );
    }
    if (opts.here && this._here) {
      const [x, y, z] = this._here,
        x1 = x * cy + z * sy,
        z1 = z * cy - x * sy,
        z2 = y * sp + z1 * cp;
      this._hereG.setAttribute(
        "transform",
        `translate(${q(CX + R * x1)} ${q(CY - R * (y * cp - z1 * sp))})`
      );
      this._hereG.setAttribute("opacity", clamp01(z2 / 0.2).toFixed(2));
    }
    this._dirty = false;
  }

  /* ---- motion: a frame only while something moves ---- */
  _spinning() {
    return (
      this._opts.spin &&
      this._seen &&
      !this.hidden &&
      !this._reduced.matches &&
      !document.hidden
    );
  }

  _moving() {
    return (
      this._dragging ||
      Math.abs(this._vyaw) > 2e-6 ||
      Math.abs(this._vpitch) > 2e-6 ||
      this._spinning()
    );
  }

  _request() {
    if (!this._raf && (this._dirty || this._moving())) {
      this._last = 0;
      this._raf = requestAnimationFrame((t) => this._frame(t));
    }
  }

  _frame(t) {
    this._raf = 0;
    const dt = Math.min(48, this._last ? t - this._last : 16);
    this._last = t;
    if (!this._dragging) {
      if (Math.abs(this._vyaw) > 2e-6 || Math.abs(this._vpitch) > 2e-6) {
        this._yaw += this._vyaw * dt;
        this._pitch += this._vpitch * dt;
        this._vyaw *= 0.94;
        this._vpitch *= 0.94;
        this._dirty = true;
      } else if (this._spinning()) {
        this._yaw += ((1.6 * DEG) / 1000) * dt;
        this._dirty = true;
      }
    }
    this._pitch = Math.max(-75 * DEG, Math.min(75 * DEG, this._pitch));
    if (this._dirty) this._draw();
    if (this._moving())
      this._raf = requestAnimationFrame((next) => this._frame(next));
  }

  _changed() {
    this._dirty = true;
    this._request();
  }

  /* ---- pointer ---- */
  _bindPointer() {
    let px = 0,
      py = 0,
      pt0 = 0;
    const perPx = () => VB / (this.clientWidth || VB) / R;
    this.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      this._dragging = true;
      this._vyaw = this._vpitch = 0;
      px = e.clientX;
      py = e.clientY;
      pt0 = e.timeStamp;
      this.setPointerCapture(e.pointerId);
      this.setAttribute("dragging", "");
      this._request();
    });
    this.addEventListener("pointermove", (e) => {
      if (!this._dragging) return;
      const k = perPx(),
        dx = e.clientX - px,
        dy = e.clientY - py,
        dt = Math.max(1, e.timeStamp - pt0);
      this._yaw += dx * k;
      this._pitch += dy * k;
      this._vyaw = (dx * k) / dt;
      this._vpitch = (dy * k) / dt;
      px = e.clientX;
      py = e.clientY;
      pt0 = e.timeStamp;
      this._changed();
    });
    const release = (e) => {
      if (!this._dragging) return;
      this._dragging = false;
      this.removeAttribute("dragging");
      // Under reduced motion a throw does not keep turning
      if (e.timeStamp - pt0 > 80 || this._reduced.matches)
        this._vyaw = this._vpitch = 0;
      this._changed();
    };
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      this.addEventListener(type, release);
  }
}

if (!customElements.get("home-globe"))
  customElements.define("home-globe", LuzGlobe);
