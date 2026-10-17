/**
 * <home-globe>, the puzzle version: the globe of globe.js, lit by the sun,
 * with the land as a puzzle of small pieces and nothing else: the cuts between
 * the pieces, and the coast around them, are drawn in relief, a line of light
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
 * naturalearthdata.com), their borders dissolved, re-encoded by
 * scripts/globe-puzzle-data.js (its header says how; the block below is
 * written by it, never by hand).
 */

// luz:puzzle-data:start
const QX = 1200,
  QY = 600;
const ARCS =
  "J0qCkPCACBBDDADAAECCEAHzqCIAB8qCBDBBEKC_qCAI2tBsCDHADEBAFADELCAC9LwGACK_V4FBARKLCDGCEHEBGHEAEgFlCiDMAMDGAOEKAKCKCGBEACEEAMFIECFICCCIAKDaDGCIDHDMASAGCGDICHEECOAMDIAMDKCKABEGCMDAFEGEAEGPICGIGIBGBKHFDMAAHKGIDBFGDGEGGAIUBIBADDDEDABNFHAHCBDHHHDJBDBBDFBJDFHBFBHKAGLKCMBIDEBIBIDSABFCFGHKFECEGDKDEKEIEEEAGFGHEIIBGBKECSDGCOFCBMAAFCHGBEDKEIIECEFQPBDIDGDMBEBCFGACBAHHFLBHFLANCPBFDHBJJHFGCKIOGKAGDFDELIDMCGIAFGBHDPDFBHFDABGMGJAHBFvD0DGEIAHFFCHcmCHCEEQAMDABXAFDnCECEBDDDEG3C2CDBRCECKCIDEBQPCMAEBGTKIDJDFCDGMAT6BdbCDIFCNCHCECMAIBOAEDMDSAKAaAIDNDHChBBF5EaKBPDHCOEECEIBRBKEcyL3FHJECEBBBGBCCIBBDEAEHDDHACGBAHFDAGEHCTAACECBCEEIKEEGCCBR9F8CQDADGCEDFBJCDEFDJDBEJAGCEMEACDGAiCiBwBIEODKDABMCIFQBGBGFLDODMBKFKABDLHHCJGJAADGDMDEHBDHCPEQHADRENEHCCCRIABTBFCEGaABCEEIGDGJENCEAHGJCDBLBXCZEDCGCJABIGGGCSCFDGDGESEKHADMCKnDMOAMBJFHAFFHADGEGGCH9FOaIUCBFXDJBJCI_BzEGABFGFDAJIAGEBH0FoFgBBIFVCPAICJEN3DrGBBLEBCFCACHCBEMBGAGFGBCDNOsFKBQAODXFJFABPDDEPEOMFEWAT8CKMABFXAPDJABCOEdBHCIGGCUBMDKAHGGCGAGFkBIRIDGJWHABJAEDBBXETDdBDEHCFAHEOCKAICLAXADCQEJALCKGSEGABDOCKBICGBEFECDIMANoBDFGGCIBMCCBFDKBAFLBbIACOBFnBGOAFDJECAJ2BWEDBHRAAELAAEIAUEMQaYEIDWBOHVFZAFEGENAJEEElBeIeCKEQDEEWCqBAwBAaDnBFQAbFJFRBTBKDRDJFKBRDPCTBVCBEMABGWDJGJAQECCLIYBKClBALENGIsD_CDBHAACCEGCGBBDIrEOEDDBHCFAJCMGMDH0GjECCIBIDDAHCFCHERCDKAFDHEBCECoCVNCBHBNDDFADCDEANBFBFBKCCBHBFAAFFDDEEHFHCEDEBEABCFAFCACHFFFBDDDADDHFFFBFEJEDADCFAHBDFAACBCHMACAEAEFGBAHBDEDAHAFAHACBAFBCDBDADEFAFAJBFDFDDBBDCHABajEsBBEDEDAACDCBAFCBEHIDIHKBGDCCGAGBGCGCMBIDKCAKBCFCCBKH5G_FEDDBDAAEAEEBEDEBABCEBBFEEHCCBBAACEHEBBBCEAGvB-HGAABDBHEGAG4CPIBLFDCBEKCjD4ETJEBGHGDGPAHCNGREJALEHCHBCDLBNDAECGICBCHDFDHDEDFDNFBBJDBBHDDATFJBBCOEIEICCCKEGECEEEHBBCDBDCBBDEFBDAAGDCHBJGAEFCEEEECCKAGEGAECDEECLBBBDCJAJCBCHEYGEAADOAFEHEJGJCEEMAICCEGCUEGAKEKBGBCAMABBMAGAOBSBICSDHrGlBIBMBFBHCHACER2uBzECEBEHCBGDCACGBAGGAGAAGAEHADCHDFAdkTnKMDMDIFCDKDCDFACFGDEFEAADEABBIBBBDBBCLCHIDGJEDBDBAFFBBAHCKuCkBCBADBBBGFGFCCCIFEBSJNFDDAJECCGBCCCCCBEAEEAEEACAADBDDBBAIYCEFEBBBDCBEBGCBiB7CXFEFCBBHACGECBGBGNGDAJGBBDBAGFEICEAACJADEFABEKCCCMDABCJIDEGIEGAKDIBGpDrBDFFBAECEICG8BOAGCECBADDDarDqCDFEFADIFHABFAFFDBFBJACHDBEFCBCHDDEDAFAAKDCBEBGCGEGIiEfIBCFFEDAJACEIAGPHDCBCGCCDBBNGoBCDEAABAFDAADCDBABEBIAGCCrBfHIAGEDHFAFAJAFABFGFEEMCADDCBDFBGJABGHADDBDCEGFBBCACDEAGDBAPDBBCCGBGBABGCECECMCCGEGBIAGRpCHEGCGDBBBAJGMGAGCBDJBHCACECEBJTAEACBLBDACEEACCCBV_BOADMACCMBEDKBIDHBHCLAFCHCFCBBLCBEFAGGIAIBgBbiBADEDEAEDBHALHAFGHGBEFGDEDKFGDKFEDGFEFIACOBGFIFGHIAGDEFEDBDEDCAHhkB1KGHIFKABDHABCmB4BsEADIFADEBADFHJDNBHCCDBFCDDBHAFCBBAFGBCCCDFBDDBFBDFADDBDGFGABFHDDHFDBBCHEDDCPMRBBFBHADCHANIJIGBKDIBECCGGCEAlBACFAHDBFJCHEHEBECEDEAMCGIGJCGECMIBEOFCBJDCEWEEBGAICAEMEKEKBKCGAIEIAMEeAKBKCoRyCACQ0HyDKCCCCAAJBBAFHPFJFHHHFFJFFFHHBFIAAFBBBBBADBBBDBDGPyFCFBBCFCHGDN9WADCHABBDCACMBCCDEACDACCKAPAAGAGBABEAABEACBBBDADADADABDBCLwiBkNOCMDQFBFNARALEFEHCSEG8BLQDBBlBBOIKAJwHTSAYDFFXALALECEKCH-BFQBFBLALECCMBF3BLGCKAKDZCG5TwBkBCKBZDDEPADlFvFAEKCX2G8DQGBCmBIWCMCMAGBFBrBFTFTNAFODDBVCBCLCAEGCAEMEFCW0SlEEFBFEHGLJCDHGHADDEDFBGAGAICEAKDGAKGCBEEAADHvTvBDDFBFFGFBFIHK5BMHGHCFEGAEGBCIEACFBDjCyCIEFE3HU8BGCMDSBYHGBADHDJBdGDBKDAJODCCDEECQDGCDEOIGBIBCGDECEDESDEBHBADEBMCAEmBKGBHDIAGCMAKEIDIEHEECUBIBYHGEHEHCCCDIMGGGEASACDHFGBCDBJIDDDLJGAECGCCCGEDEEEHABEGGHGMEBGGDBFIBDGMCOAMDFGBGMCQAOADEIEGAOESCCASCEBQEMAIGQCMBJBQAADICSAQDEBADZFDBSBGCCFOEWBCBcBAGYBMDCDDBIFMBGGKBMCMBGCKBDGIE8BDGDSFaCOBGBBFIBKCMAMAMAMFICDECEWBOASD1qCBQFSFADEBBGSBOFHDJAAFJBDCJCAEHAHABCACHAEDDBgrCAHDJAGBIHBDLARDFATJBBJERFBEFDJCBFHFABIBAJHABFCBJDDHJABHHFDEFaEIGEAEKCMIMGMGEKHBDFPFFIRBPLGDZBAEJCHDTCVBvBdMACDIBEEGAKHAFDFBHBLJHBFVRJDDADCJDABI3gCiGGCKBHDHA4qCAAC3qCCL6sBrFCBICBDHAHDDCCCHCIEBAErX_DIAHBACFICEBAFBEBEIDLCAEFADBABEBCAEKyDhQIEGBEEGDBBJBBCFBDCP8PubOCeHRBBFFADFHANEGCJCNGDGSCMBUZrEDENHJAHCBIBQGESGMGcWeOOCMAKGMAMAUDHBIDJZmCJDRATARGUCKBGCeDGRNNDLCAEOCMDoD7OeWEYAICYC2BBqBDND7BAaAUBOCEDFBQCgBCUBEBjBHNHAHIDTDMBCFHAIFNBIBBBTBKDABNCDBKBIDCDJBNGCDHDcAjBLTBHAFBJHNDXDFDADBDLFEFHLHAJGNAFEDGLIDEAGJGCGDCGIKCEIPDHCBEEEUBRGFAFCIGROHCAERENAhBATGSCMAbCNCACyBICCRCGCiBGDEkBCWAGBSEoBFPEACGkYpbEBGBBDJACIG2LoIACMCCABBLDbnTzDAFBDBDFDHLLJDDHBDAABDADAFAHAFBFBDBDADCDEAEBECCAEDIJOczXqLBFBDALCHCDEFCDCBIBCDGCGCICECCEAGCCECICKACBADDBBFCADHBC_BZbHIDCFCDADBDBJEFCDCHCHGDAFCBCHEDICGBEBGFGHGBEFCBCCEHGBEDAFIACDEBGACFCFCABCHKLCDEDEDCFEFADEAEFDDBEDEHEAGAEHEHCDEEACEACDGDCHMBGIoN5NBDHDFCBAFCFADE3BuB-HCACDELCACFFDCBMBAFGEIBKDEDBDICODKAKDIHEBGAEBCLBLDDHJFHDDBBBDALBPBBBHFJAFFDBDHAJBDBHBHFFFAFADAFBDDBHLFFDBDHDDTxDoDFEACNGLIDEDGCCFIFMFODEBEDEFECCBGCGEEMKgBACCAAECCCAGIBCAEAGAGDENEKEAEEEAAIEEEACCEBIGECEBBBRrBdBCAEACFEBABBDBABCDBBDAAEDAACFCDBKEKCDEACBCCICCCEAGBEDHlBDDEACHGBBDEAGDOBCBGFFVKDEBCFGCAJcOADBBBFCFBAADBBCDCXODEJBOECIACAEAEAEAGDCBEfJABDAJECIOEBDLLHAFEEacABBLBDf0DbABDACBADBDCFCACGBCAGICACCECFEAGDABGAGAEBGAECQCFBCDGAEDCDCAEBGAAEBEFABCAIFFAAIBACGAGBEAAIBGFCBFqMoIFDNCJBADOfGCECMFIFEJCAEICMBBIGDOGCGGAHqB3BECCDBFDCBECCMxSxJEEBEBDDECABGCCCECEAEIEG0CyDEBABJAAEGAJrCAGBEBDABBDCDCACEAgBdeKAGBEBGAMHGBABEAGBBBHBDCJBEEBCDADCAEDAFCBAJCBCCAFCHFFAECACGEIAMwU3KDEBGDKBKAIAEDEBEFOFGAEF9FuGBGDCECEICBZAGICUAECCAGBKCEBEDCCkEhDFBJsBHFBBADBDADEBGFEJAFuBZCEDEBCDGCrBIDAFAALDDBFBFCFAAFALALFBCFjBeFGDCAEBCEAADCDADGG8BzBBAFCFGFCDGEAAFCDEBICoF9CFIFAAFGFGDGGODAABCCIasGzCCDAFAFAJCDDJDDNFHFBBFDBBADCFCFCABFABCBBBBDNFBBCBBDCnEsEBENBxCAEAGEKCIGICIBCDICEDMBEACDyE4HEGCGDAACGEEpB6C5JEFAHCDBDBEABAFBDAFJdDHBHFBFBHEBCAGDGAECGCAAEEEAEBIAGCEAEEAGCCAEEGECEACCAEEAECECDC5NsFACPoF8EIEEBADGEABDDABCBAFDDABEACDCBM5COGEICECGCMCKAEBGEGAEBEACyFxBBAFwDhBCBECKBOOCCBAFHlBAAECECACBADBDDVkBADCFCCKDAV4BhBCDEBKBGJBFDBBDDABDCDDBDBBDDADBADBBDCDBDADU-BCCADFiX1IEDBABCACFBCBGEBCDDAE_MuFFABEDIOAAFCFACGFABHDPADEACFCFEDEBCBHLCDCACHIADBEEKRAABGCEBEAIBCBIBKBELHHCCKBGDIACDADGQoDGHFFFBDMPGDEFCLALFDHDDFHFDECEDEIwF0GBAFDAFFDHBADGDFNFHABCEIHENcHGHCDAHDDFBDBFABCCGDGGCDGlB3HnDBDDAHAAFDDHDHHFDFDADJDBABFCNDFAJDBBDCBFBBDDBFGFQDIDOFIDWAIBGJDDCHICCBCHGIiFTBEBGBEFAABBDHCHrEKDCBEFGLBJAJAOxBwCBECIFCCEDAAGIBEEDEBCFAAFBEHXVCFGAEDKBKCCCPyBvCTCHCBIDADAHDHCFGFCDGFIDADCBBDzCeAGACSvCqGLBFDADXLDJEDIDFFHBBLDFHADDHABGFGDKG0FtCDADBHBDBADGLCJCAEHBBDDDGnD4BECUGGBABIAEiC7BABFABHCvBsCBGHAAAEEEGEGFEACGIAAAEBBDCAEQEIBGAFrEnBGCCBEEBGIKAABGBABICECGDEBEgDhCDDBDCDJJrBBBJBACHCCCEBEAKAVBkBHAHAEDFBDEBBCDEBBBGFABFACBDBCFDAFEDKFGACdqDZBEECDAFCFDJBDEHABBDBFEHADIDCCGDEIGKACEOAIEICKAMDKDICGAICH7CECBGBBBHAHFBEFnBHDEBECGACIHEJEFCDEBGDCBDBGCrCkBGCFAAECGKICGAM_CrDBBDADACGAEDABCCECECGBIIAAAEBCIGIBKAIAQARgBFADFFHABBDDBFCDDBAFFADFPAFDDADGFCIIwDCFFFLDHCEGBIOIIkkB7PIHBBHGJIACCAKFFZmCCBDABEEBHBGBBDGBECAEDCDFFBFABEGACDGHMCBFCFECCIFFPICBDABEEBfkE9GFHFBDCEGBEHCCEECAEAEBGHKDEEAEDEBCFEFCECBCDEBEBEEEBBFBDDCBBAFXvBVIGEGCCCCEECFGECFHHBDCBFADBFLJDFADCFABCEGIGKEPzESEACHDBAFBCDDFADGBEDGACGAGBICvFvE6BFDFBDFJAFAHADDBAHDHAHEDCAEEACKAEDGBEAEBGBCBGDGACCBBGGFAEFKAECEAECECDCEGCCEGCEAGCEAECCAICEECECCCGEGCFECBECCCACEEGECACCBACICEDEDIABEEGCAACCEECEAGCACFCECEBEBGBCAEBECEAEBFFBACDFFCBEDGBIFGBABGBGCCGCKAIAKEICCCBADEHCFCDECGFBBCJCACFADCDIDIFABEDCFCAEBCFIHGDAFAHEFAFDHADADDHDBFHBFBDBDAHDBHAFBFFJEAEBBFDJCJCDEDKBCHACEAEDDFBEEAEEEBEDFDBDDDCAEDEDECAJEDAFELAPFHCKlJoIBFBBFBDGAICMEDEDEHK4FoCFCAGECGCEACBBDBDFBzBiDwEHBFBFBCCAEEEDCDBHDDDHABDEDEBABGBIEGBEAADHBDDFBDFIBCHEFEDAFDBCDEBBJDAJPFHJFJFFADDDCDBHDHBBFDABECCHCDAJ8CSDJDFBGBGEGGEEBBDjBvWuEDAFBADCDGDEDGFGAADKDGBADDCFCBDEDABDBBDDBCGCCFGBCBCDCDCDCFCJIBGHEHDBAKwBlBGABDABBDDCNECEIAGAKnBSECEDBHBADBBCAIBEEBLB-CBEAGCEGCICAFCBBBFDCDGQICDDDFEBCKCEjEFGAGDDDpBWDAEDEHCBCCCBCDDAIDCEIEEOAHFOAADFFGBGHGAGLIABDDBEDFDJAJBDCDDFCDBDAKIGALCBCICDECEKASrC4CBFIDJDXFbCGENCMCACNCEEKAKDKEKBKEMAHkNlFGHGBFABHBBABEvBUAEBEJGG8QtGDGGACBBFBCMMRACCEEABDGGBFBBBDBBDECCYYJCHBFDGBBCFBBHEBECEDCBBDADDBCEGIECDECCEEAAGGDAFJzBGHFCEGEEGCGCFDDDDgBa8BBDCDAFDBBFCDEBCCIDADCBABFCBEBBDEFBDCAECABCABDEACAICDAMCGEAEBEAIBtBBEEBEAADBBDBAGNWGCHDCCFDBAEBABEEAACDGGACBR7EnBGFEDBHCFCBCFABDAFGHEAEDEBGBEAEAEHgCdEBGAAGECIAIKLIGEEEGCAEDABKDABDAADDBDXCCCGEBlVsIOgDkDLBLBLBDEFCCIDGEEGEOGGCBCHEHgD_JEHCFEDIFKJEBkByUyFFHAFBFADBDJBLBHFFCAELAFDHAGFDJDDDECGDCDEICCEIEEEOCGBIMEBOIEIBIEEGCEJADPSgBECCHJBFFJEDFFABGEEGCCICGIHKBMxClCEEEBCEGBABDDBCDBBDDCAESvQvDDBBFFBLDFDDADDDAHBDDFADABEAEBGBGCEHkByCEFCACDEBAFEFCEBCBT5B1BDGACDCDGBGDEBCFGAIDIBCDCBGDEBGHKDAEIKtRrWMCUFEJLBjBDPAHGUEQKH1DPeAIGGDDFbALEPxB8BMCCCAIEEGAEBILBHPBHACENBFEICI9FDECaBGAEDDCZBJEHnELCEQDICJDHAHCEdCECSDVCHzHhBECOAKDCDLARGmJrDnBGEUAMDKESAUD8BFUCsBfkBiBCCvBCXEEMZGgBAKBWEEGRCnBCRIBIKDWCEBMAYGKAAIIAEBSESAYEKAKAKASASAmBAOCKAOCMFGCIBQDSCeBCCHGHADCDIOBKAOBCBKAaCGBKCGEEBQBGBQAIBIEIBIAMDICOCaEKCCGHKAGGIBGMGKECEIEGAECKCKEEAEBBBJDJCLFBFEBJBLFBDGDKDMLAFGHBDHDHBHDJBZDDBrBBCBKBKDFBLCJBAFSHOAiBFgBBYFKDeGaEQAeDOGSAgCGHInBBAIYEWGWEUAiBIMECCHCIEOEMEIEIACBIAEGIBCBIAQCIACDICWEUEECEBICIFICKEIACDGEWAQBGDICWAOCGCOCECIGGBKDGAKDGCCEOCOCQGGBKEMCCCKEOCMBGBABKDIBKDGAMESBOAEHADLDADIAHHOBICGEIEEGaCKIMEMEGAOAGAGCCEGDMBGAYAEBUCGAWKIBOFMAOCKEOAEAIDIAMDQAKEGAMAMAMBOEOAMACGEBGHGAmBAQAEBABEBODYDIAECSDQBCBODGBYAOBUDNNHALDNHDDAFIHMAEDVBNALLaJiBFEBYDUAaB_qCAFqsB-YCCEAGCDDFAAFDDCACCAbrK7CAEECCEACCEEECCCEACCGECEGECGCGECCGGBIEKEEMGGKGAEBGAKBL2FXIAQDIEGAGACDACGBGACCPELBBAFDDFGDKABCFEHGJEHGFBBADKHRpFqCIBECEBKBCFQDIDGEBGCCGEEAIACDMBCBF4D9DABABDBEBHAAGFEAGCGAMEEACjGsGHEF1QzGGAADFBAG";
const LAND =
  "B;D;tErEzQxQlPvEtQ7JzPtPnK_JpK9JxPhKvPjKlKpLjL_KhL1KzK5OxKvK3KzN7K9K5KtF9FtLjPrF7L5L3LhFzL_L9N9LxMvM7H1MzM3M5H3NtM1QrMlMpMhM1LxLxFvLpFpOnMrLxJvJrQvQ3J5JpQHtIpI1JrI9I7IhJ_I5I3I1IvIxIzInJlJjJrJpEtJnIpGpJF;pCtGtHpHlHhH9G5G1G_HzGnEjEvGxG3H1HzHxH3G7G_GjHnHrHvHrGnCL5CJ;N;P;R;T;V;X;Z;b;d;f;hB;jB;lB;nB;pB;rB;tB;vB;xB;zB;1B;3B;5B;7B;9B;_B;hC;jC;lC;rC;tC;vC;xC;zC;1C;3C;7C;8CmFmOmLkL;nD_C;hD;jD;lD;nGpD;rD;9O_O7OtD;vD;xD;zD;1D;3D;5D;7D;9D;_D;lEhE;zExE;1E;3E;5E;7E;9E;_E;jF;lF;vF;zF;1F;3F;5F;7F;_F;hG;jG;lG;9H;hI;jI;lI;zJ;rK;tK;jM;hO5M;7M;9M;_M;hN;jN;lN;nN;pN;rN;tN;vN;xN;1N;5N;7N;_N;jO;lO;rO;tO;vO;xO;zO;1O;3O;hP;nP;pP;rP;1P;3P;5P;7P;9P;_P;hQ;jQ;nQlQ;3Q";
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
  const v = ints(ARCS),
    start = [],
    len = [],
    gx = [],
    gy = [];
  for (let i = 0, x = 0, y = 0; i < v.length; ) {
    const n = v[i++];
    start.push(gx.length);
    len.push(n);
    for (let k = 0; k < n; k++) {
      x += zig(v[i++]);
      y += zig(v[i++]);
      gx.push(x);
      gy.push(y);
    }
  }
  const N = gx.length,
    X = new Float32Array(N),
    Y = new Float32Array(N),
    Z = new Float32Array(N),
    seam = new Uint8Array(N);
  for (let k = 0; k < N; k++) {
    [X[k], Y[k], Z[k]] = vec((gy[k] / QY) * 180 - 90, (gx[k] / QX) * 360 - 180);
    // A point on the antimeridian or at the pole: a segment between two of them is a seam of the data, not a line to draw
    seam[k] = gx[k] === 0 || gx[k] === QX || gy[k] === 0 ? 1 : 0;
  }
  // The rings of the land, each one list of point indices
  const loops = LAND.split(";").map((ring) => {
    const idx = [];
    for (const ref of ints(ring)) {
      const a = ref >> 1,
        s = start[a],
        n = len[a];
      for (let k = 0; k < n; k++) idx.push(ref & 1 ? s + n - 1 - k : s + k);
    }
    return idx;
  });
  return (topo = { N, X, Y, Z, seam, start, len, loops });
}

/* The small pieces: a jigsaw over the whole sphere, built once. Rows of STEP
   degrees of latitude; each row has as many cells as keep them about square,
   so the rows are staggered like bricks. Every edge of a cell is a polyline
   with a knob in its middle, out on one side or the other, in degrees along
   the surface: a horizontal edge follows its parallel, a vertical one its
   meridian, so neighbouring edges meet exactly at the corners. */
const STEP = 7;
// The knob of an edge of length 1: along, and across to one side
const KNOB = [
  [0, 0],
  [0.4, 0],
  [0.39, 0.07],
  [0.42, 0.14],
  [0.5, 0.17],
  [0.58, 0.14],
  [0.61, 0.07],
  [0.6, 0],
  [1, 0],
];
let jigsaw = null;
function getJigsaw() {
  if (jigsaw) return jigsaw;
  const pts = [],
    start = [],
    len = [];
  const edge = (points) => {
    start.push(pts.length / 3);
    len.push(points.length);
    for (const [lat, lon] of points) pts.push(...vec(lat, lon));
  };
  const rows = Math.round(180 / STEP);
  for (let i = 0; i < rows; i++) {
    const lat0 = -90 + i * STEP,
      lat1 = lat0 + STEP,
      mid = (lat0 + lat1) / 2;
    const m = Math.max(1, Math.round((Math.cos(mid * DEG) * 360) / STEP)),
      w = 360 / m;
    for (let j = 0; j < m; j++) {
      const lon0 = -180 + j * w,
        side = (i + j) % 2 ? 1 : -1;
      // The top edge, along the parallel lat1 (none at the pole)
      if (i < rows - 1) {
        const c = Math.cos(lat1 * DEG),
          L = w * c;
        edge(KNOB.map(([a, n]) => [lat1 + n * L * side, lon0 + (a * L) / c]));
      }
      // The left edge, along the meridian lon0
      const c = Math.cos(mid * DEG);
      edge(
        KNOB.map(([a, n]) => [lat0 + a * STEP, lon0 + (n * STEP * -side) / c])
      );
    }
  }
  const N = pts.length / 3,
    X = new Float32Array(N),
    Y = new Float32Array(N),
    Z = new Float32Array(N);
  for (let k = 0; k < N; k++) {
    X[k] = pts[3 * k];
    Y[k] = pts[3 * k + 1];
    Z[k] = pts[3 * k + 2];
  }
  return (jigsaw = { N, X, Y, Z, start, len });
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
      if (next === first) break;
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
    // The land: the small pieces are drawn inside it only. The cuts and the
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
      this._J = getJigsaw();
      this._PJ = new Float32Array(this._J.N * 3);
    }
    const lod = w < 420 ? 1.9 : 1;
    this._lod = lod;
    for (const u of this._jig)
      u.setAttribute("stroke-width", (0.7 * lod).toFixed(2));
    for (const u of this._coasts)
      u.setAttribute("stroke-width", (0.9 * lod).toFixed(2));
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
      J = this._J,
      PJ = this._PJ,
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

    // The coast: every arc, once
    let coasts = "";
    const idx = [];
    for (let a = 0; a < T.start.length; a++) {
      idx.length = 0;
      for (let i = T.start[a]; i < T.start[a] + T.len[a]; i++) idx.push(i);
      coasts += strokeOf(P, idx, T.seam);
    }
    this._coastSrc.setAttribute("d", coasts);

    // The land: its rings as filled shapes, the clip of the small pieces
    let land = "";
    for (const loop of T.loops) land += fillOf(P, loop);
    this._clip.setAttribute("d", land);

    // The small pieces
    project(J.X, J.Y, J.Z, PJ);
    let jig = "";
    for (let e = 0; e < J.start.length; e++) {
      idx.length = 0;
      for (let i = J.start[e]; i < J.start[e] + J.len[e]; i++) idx.push(i);
      jig += strokeOf(PJ, idx);
    }
    this._jigSrc.setAttribute("d", jig);

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
