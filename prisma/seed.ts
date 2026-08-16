import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { planCapacity } from "../src/lib/planning";
import { computeUnitRate } from "../src/lib/pricing";
import { buildStageList, PROCUREMENT_STAGE, FINISHED_GOODS_STAGE } from "../src/lib/stages";
import { buildDeadlineBreachAlert, buildStageEntryAlert, getContactDirectory } from "../src/lib/alerts";
import { hashPassword } from "../src/lib/auth";
import { planManpower, type ManpowerDepartment } from "../src/lib/manpower";
import { workingDaysBetween } from "../src/lib/working-days";

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * DAY_MS);

async function reset() {
  await prisma.manpowerPlanLine.deleteMany();
  await prisma.manpowerPlan.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.ocStageEvent.deleteMany();
  await prisma.ocDepartmentPlan.deleteMany();
  await prisma.orderConfirmation.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.pricingSlab.deleteMany();
  await prisma.productMaterial.deleteMany();
  await prisma.productDepartmentRate.deleteMany();
  await prisma.productColourImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.colour.deleteMany();
  await prisma.department.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await reset();

  const settings = await prisma.settings.create({
    data: {
      id: 1,
      procurementDays: 3,
      rampDays: 1.5,
      shiftHours: 8,
      gstPercent: 18,
      plantHeadName: "Plant Head",
      plantHeadEmail: "plant.head@kreuger.local",
      procurementHeadName: "Procurement Head",
      procurementHeadEmail: "procurement.head@kreuger.local",
      dispatchHeadName: "Dispatch Head",
      dispatchHeadEmail: "dispatch.head@kreuger.local",
    },
  });

  await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@kreuger.local",
        passwordHash: await hashPassword("ChangeMe123!"),
        name: "Admin",
        role: "ADMIN",
      },
    }),
    prisma.user.create({
      data: {
        email: "manager@kreuger.local",
        passwordHash: await hashPassword("ChangeMe123!"),
        name: "Plant Manager",
        role: "MANAGER",
      },
    }),
    prisma.user.create({
      data: {
        email: "viewer@kreuger.local",
        passwordHash: await hashPassword("ChangeMe123!"),
        name: "Viewer",
        role: "VIEWER",
      },
    }),
  ]);

  const [injectionMoulding, fabrication, powderCoating] = await Promise.all([
    prisma.department.create({
      data: {
        name: "Injection moulding",
        sequence: 1,
        headcount: 15,
        unitsPerWorkerPerDay: 2.0,
        maxUnitsPerDay: 30,
        headName: "Injection Moulding Head",
        headEmail: "injection.head@kreuger.local",
      },
    }),
    prisma.department.create({
      data: {
        name: "Fabrication",
        sequence: 2,
        headcount: 20,
        unitsPerWorkerPerDay: 0.75,
        maxUnitsPerDay: 15,
        headName: "Fabrication Head",
        headEmail: "fabrication.head@kreuger.local",
      },
    }),
    prisma.department.create({
      data: {
        name: "Powder coating",
        sequence: 3,
        headcount: 30,
        unitsPerWorkerPerDay: 0.5,
        maxUnitsPerDay: 15,
        headName: "Powder Coating Head",
        headEmail: "powdercoating.head@kreuger.local",
      },
    }),
  ]);
  const departments = [injectionMoulding, fabrication, powderCoating];
  const stageList = buildStageList(departments.map((d) => d.name));
  const directory = await getContactDirectory();

  const mastro = await prisma.product.create({
    data: {
      name: "Mastro",
      code: "MASTRO",
      baseRate: 4500,
      hsnCode: "9401",
      description:
        "Medium back mesh task chair\nSelf-calibrating multilock with seat slide mechanism\nAdjustable lumbar support\nThree-way adjustable armrests (height, swivel, front and back)\nNylon base with 60mm castors\nFabric-upholstered cushion seat",
    },
  });

  // Second product — proves the model isn't hardcoded to a single item.
  const nova = await prisma.product.create({
    data: {
      name: "Nova",
      code: "NOVA",
      baseRate: 6200,
      hsnCode: "9401",
      description:
        "High back executive chair\nMoulded foam seat and back cushion\nSynchro-tilt mechanism with tension control\nPolished aluminium base with 65mm castors\nHeight-adjustable headrest",
    },
  });

  const colours = await Promise.all(
    [
      { name: "Black", hexCode: "#1a1a1a" },
      { name: "White", hexCode: "#f5f5f4" },
      { name: "Red", hexCode: "#dc2626" },
      { name: "Blue", hexCode: "#2563eb" },
    ].map((c) => prisma.colour.create({ data: c }))
  );
  const colourByName = Object.fromEntries(colours.map((c) => [c.name, c]));

  await Promise.all([
    ...colours.map((c) =>
      prisma.productColourImage.create({
        data: {
          productId: mastro.id,
          colourId: c.id,
          imagePath: `/products/mastro-${c.name.toLowerCase()}.svg`,
        },
      })
    ),
    ...colours.map((c) =>
      prisma.productColourImage.create({
        data: { productId: nova.id, colourId: c.id, imagePath: "" }, // generic swatch glyph
      })
    ),
  ]);

  await Promise.all([
    prisma.productMaterial.create({
      data: { productId: mastro.id, materialName: "Plastics", unit: "kg", quantityPerUnit: 1.0 },
    }),
    prisma.productMaterial.create({
      data: { productId: mastro.id, materialName: "Chrome", unit: "kg", quantityPerUnit: 1.5 },
    }),
    prisma.productMaterial.create({
      data: { productId: nova.id, materialName: "Aluminium", unit: "kg", quantityPerUnit: 2.2 },
    }),
    prisma.productMaterial.create({
      data: { productId: nova.id, materialName: "Fabric", unit: "m", quantityPerUnit: 1.8 },
    }),
  ]);

  const slabsData = [
    { minQuantity: 1, maxQuantity: 24, discountPercent: 0 },
    { minQuantity: 25, maxQuantity: 99, discountPercent: 5 },
    { minQuantity: 100, maxQuantity: 249, discountPercent: 10 },
    { minQuantity: 250, maxQuantity: 499, discountPercent: 15 },
    { minQuantity: 500, maxQuantity: null, discountPercent: 20 },
  ];
  await Promise.all([
    ...slabsData.map((s) => prisma.pricingSlab.create({ data: { productId: mastro.id, ...s } })),
    ...slabsData.map((s) => prisma.pricingSlab.create({ data: { productId: nova.id, ...s } })),
  ]);

  // Three sample purchase orders (stored as Quotation)
  const partyDefaults = {
    vendorName: "Maruthi Enterprises",
    vendorAddress: "No. 12, Industrial Layout, Peenya, Bengaluru",
    vendorState: "Karnataka",
    vendorStateCode: "29",
    vendorGstin: "29AABCM1234D1Z2",
    shipToName: "Krueger International Furniture Systems Pvt.Ltd.",
    shipToAddress: "Jigani55, Bommasandra-Jigani Link Road, BENGALURU-562106",
    shipToState: "Karnataka",
    shipToStateCode: "29",
    shipToGstin: "29AABCK1234A1Z5",
    contactPerson: "Plant Manager",
    contactPhone: "+91-80-1234-5678",
    contactEmail: "manager@kreuger.local",
    buyerName: "Procurement",
    paymentTerms: "Advance 100%",
  };

  const q1Qty = 50;
  const q1Rate = computeUnitRate(mastro.baseRate, q1Qty, slabsData);
  await prisma.quotation.create({
    data: {
      quotationNumber: "PO-2026-0001",
      productId: mastro.id,
      quantity: q1Qty,
      colourId: colourByName["Black"].id,
      unitRate: q1Rate,
      lineTotal: q1Rate * q1Qty,
      location: "Workstations",
      createdAt: daysAgo(6),
      ...partyDefaults,
      remarks: "Mastro chairs — Black — Workstations floor",
      deliveryDate: daysAgo(-14),
    },
  });
  const q2Qty = 300;
  const q2Rate = computeUnitRate(mastro.baseRate, q2Qty, slabsData);
  await prisma.quotation.create({
    data: {
      quotationNumber: "PO-2026-0002",
      productId: mastro.id,
      quantity: q2Qty,
      colourId: colourByName["White"].id,
      unitRate: q2Rate,
      lineTotal: q2Rate * q2Qty,
      createdAt: daysAgo(2),
      ...partyDefaults,
      remarks: "Bulk Mastro order — White",
      deliveryDate: daysAgo(-21),
    },
  });
  const q3Qty = 40;
  const q3Rate = computeUnitRate(nova.baseRate, q3Qty, slabsData);
  await prisma.quotation.create({
    data: {
      quotationNumber: "PO-2026-0003",
      productId: nova.id,
      quantity: q3Qty,
      colourId: colourByName["Blue"].id,
      unitRate: q3Rate,
      lineTotal: q3Rate * q3Qty,
      createdAt: daysAgo(1),
      ...partyDefaults,
      vendorRefNo: "ME/QT/2026/088",
      remarks: "Nova executive chairs — Blue",
      deliveryDate: daysAgo(-10),
    },
  });

  const planningDepartments = departments.map((d) => ({
    id: d.id,
    name: d.name,
    sequence: d.sequence,
    headcount: d.headcount,
    unitsPerWorkerPerDay: d.unitsPerWorkerPerDay,
    maxUnitsPerDay: d.maxUnitsPerDay,
  }));
  const constants = {
    procurementDays: settings.procurementDays,
    rampDays: settings.rampDays,
    shiftHours: settings.shiftHours,
  };

  async function createPlan(ocId: string, quantity: number, targetDays: number) {
    const result = planCapacity(quantity, targetDays, planningDepartments, constants);
    if (result.status !== "ok") throw new Error("Seed plan must be achievable");
    await Promise.all(
      result.departmentPlans.map((line) =>
        prisma.ocDepartmentPlan.create({
          data: {
            ocId,
            departmentId: line.departmentId,
            workersRequired: line.workers,
            stageHours: line.stageHours,
            stageDays: line.stageDays,
          },
        })
      )
    );
    return result;
  }

  // --- OC10001: Mastro, 100 units, black, in Injection moulding, on track ---
  const oc1 = await prisma.orderConfirmation.create({
    data: {
      ocNumber: "OC10001",
      productId: mastro.id,
      quantity: 100,
      colourId: colourByName["Black"].id,
      targetDays: 14,
      plannedAt: daysAgo(3),
      currentStage: "Injection moulding",
      status: "in_progress",
    },
  });
  const oc1Plan = await createPlan(oc1.id, 100, 14);
  const oc1ImDeadline = oc1Plan.departmentPlans.find((p) => p.departmentName === "Injection moulding")!.stageDays;
  await prisma.ocStageEvent.create({
    data: {
      ocId: oc1.id,
      stageName: PROCUREMENT_STAGE,
      enteredAt: daysAgo(3),
      exitedAt: daysAgo(2.5),
      durationHours: 0.5 * 24,
      deadlineDays: settings.procurementDays,
      breached: false,
    },
  });
  await prisma.ocStageEvent.create({
    data: {
      ocId: oc1.id,
      stageName: "Injection moulding",
      enteredAt: daysAgo(2.5),
      deadlineDays: oc1ImDeadline,
      breached: false,
    },
  });
  await prisma.alert.create({
    data: {
      ocId: oc1.id,
      ...buildStageEntryAlert({
        ocNumber: "OC10001",
        productName: "Mastro",
        quantity: 100,
        colourName: "Black",
        stageName: "Injection moulding",
        directory,
      }),
      createdAt: daysAgo(2.5),
    },
  });

  // --- OC10002: Mastro, 250 units, white, stuck in Procuring raw material, breached ---
  const oc2 = await prisma.orderConfirmation.create({
    data: {
      ocNumber: "OC10002",
      productId: mastro.id,
      quantity: 250,
      colourId: colourByName["White"].id,
      targetDays: 25,
      plannedAt: daysAgo(5),
      currentStage: PROCUREMENT_STAGE,
      status: "in_progress",
    },
  });
  await createPlan(oc2.id, 250, 25);
  await prisma.ocStageEvent.create({
    data: {
      ocId: oc2.id,
      stageName: PROCUREMENT_STAGE,
      enteredAt: daysAgo(5),
      deadlineDays: settings.procurementDays,
      breached: true,
    },
  });
  await prisma.alert.create({
    data: {
      ocId: oc2.id,
      ...buildStageEntryAlert({
        ocNumber: "OC10002",
        productName: "Mastro",
        quantity: 250,
        colourName: "White",
        stageName: PROCUREMENT_STAGE,
        directory,
      }),
      createdAt: daysAgo(5),
    },
  });
  await prisma.alert.create({
    data: {
      ocId: oc2.id,
      ...buildDeadlineBreachAlert({
        ocNumber: "OC10002",
        productName: "Mastro",
        quantity: 250,
        stageName: PROCUREMENT_STAGE,
        deadlineDays: settings.procurementDays,
        elapsedDays: 5,
        directory,
      }),
      createdAt: daysAgo(2),
    },
  });

  // --- OC10003: Mastro, 50 units, red, closed, Fabrication ran over its deadline ---
  const oc3 = await prisma.orderConfirmation.create({
    data: {
      ocNumber: "OC10003",
      productId: mastro.id,
      quantity: 50,
      colourId: colourByName["Red"].id,
      targetDays: 10,
      plannedAt: daysAgo(19),
      currentStage: FINISHED_GOODS_STAGE,
      status: "closed",
    },
  });
  const oc3Plan = await createPlan(oc3.id, 50, 10);
  const deadlineFor = (name: string) =>
    oc3Plan.departmentPlans.find((p) => p.departmentName === name)!.stageDays;

  // Procurement: entered T-19, took 2.5d (under 3d deadline)
  const procExit = daysAgo(19 - 2.5);
  await prisma.ocStageEvent.create({
    data: {
      ocId: oc3.id,
      stageName: PROCUREMENT_STAGE,
      enteredAt: daysAgo(19),
      exitedAt: procExit,
      durationHours: 2.5 * 24,
      deadlineDays: settings.procurementDays,
      breached: false,
    },
  });
  await prisma.alert.create({
    data: {
      ocId: oc3.id,
      ...buildStageEntryAlert({
        ocNumber: "OC10003",
        productName: "Mastro",
        quantity: 50,
        colourName: "Red",
        stageName: PROCUREMENT_STAGE,
        directory,
      }),
      createdAt: daysAgo(19),
    },
  });

  // Injection moulding: took 4.8d (under its ~5.0d deadline)
  const imDeadline = deadlineFor("Injection moulding");
  const imEnter = procExit;
  const imExit = new Date(imEnter.getTime() + 4.8 * DAY_MS);
  await prisma.ocStageEvent.create({
    data: {
      ocId: oc3.id,
      stageName: "Injection moulding",
      enteredAt: imEnter,
      exitedAt: imExit,
      durationHours: 4.8 * 24,
      deadlineDays: imDeadline,
      breached: false,
    },
  });
  await prisma.alert.create({
    data: {
      ocId: oc3.id,
      ...buildStageEntryAlert({
        ocNumber: "OC10003",
        productName: "Mastro",
        quantity: 50,
        colourName: "Red",
        stageName: "Injection moulding",
        directory,
      }),
      createdAt: imEnter,
    },
  });

  // Fabrication: took 6.5d — OVER its ~5.13d deadline
  const fabDeadline = deadlineFor("Fabrication");
  const fabEnter = imExit;
  const fabExit = new Date(fabEnter.getTime() + 6.5 * DAY_MS);
  await prisma.ocStageEvent.create({
    data: {
      ocId: oc3.id,
      stageName: "Fabrication",
      enteredAt: fabEnter,
      exitedAt: fabExit,
      durationHours: 6.5 * 24,
      deadlineDays: fabDeadline,
      breached: true,
    },
  });
  await prisma.alert.create({
    data: {
      ocId: oc3.id,
      ...buildStageEntryAlert({
        ocNumber: "OC10003",
        productName: "Mastro",
        quantity: 50,
        colourName: "Red",
        stageName: "Fabrication",
        directory,
      }),
      createdAt: fabEnter,
    },
  });
  await prisma.alert.create({
    data: {
      ocId: oc3.id,
      ...buildDeadlineBreachAlert({
        ocNumber: "OC10003",
        productName: "Mastro",
        quantity: 50,
        stageName: "Fabrication",
        deadlineDays: fabDeadline,
        elapsedDays: 6.5,
        directory,
      }),
      createdAt: fabExit,
    },
  });

  // Powder coating: took 5.0d (under its ~5.26d deadline)
  const pcDeadline = deadlineFor("Powder coating");
  const pcEnter = fabExit;
  const pcExit = new Date(pcEnter.getTime() + 5.0 * DAY_MS);
  await prisma.ocStageEvent.create({
    data: {
      ocId: oc3.id,
      stageName: "Powder coating",
      enteredAt: pcEnter,
      exitedAt: pcExit,
      durationHours: 5.0 * 24,
      deadlineDays: pcDeadline,
      breached: false,
    },
  });
  await prisma.alert.create({
    data: {
      ocId: oc3.id,
      ...buildStageEntryAlert({
        ocNumber: "OC10003",
        productName: "Mastro",
        quantity: 50,
        colourName: "Red",
        stageName: "Powder coating",
        directory,
      }),
      createdAt: pcEnter,
    },
  });

  // Finished goods: terminal, entered and closed together
  await prisma.ocStageEvent.create({
    data: {
      ocId: oc3.id,
      stageName: FINISHED_GOODS_STAGE,
      enteredAt: pcExit,
      exitedAt: pcExit,
      durationHours: 0,
      deadlineDays: 0,
      breached: false,
    },
  });
  await prisma.alert.create({
    data: {
      ocId: oc3.id,
      ...buildStageEntryAlert({
        ocNumber: "OC10003",
        productName: "Mastro",
        quantity: 50,
        colourName: "Red",
        stageName: FINISHED_GOODS_STAGE,
        directory,
      }),
      createdAt: pcExit,
    },
  });

  // Manpower efficiency module: seed a default plan per OC, matching what
  // the live app's OC-creation hook would produce, so /manpower has real
  // content on first visit.
  const mastroMaterials = await prisma.productMaterial.findMany({ where: { productId: mastro.id } });
  const wdConfig = { weeklyOff: settings.weeklyOff, holidays: [] as Date[] };
  const manpowerConstants = {
    procurementWorkingDays: settings.procurementDays,
    rampDays: settings.rampDays,
    shiftHours: settings.shiftHours,
  };

  async function seedManpowerPlan(ocId: string, quantity: number, startDate: Date, targetDays: number) {
    const endDate = new Date(startDate.getTime() + targetDays * DAY_MS);
    const workingDays = workingDaysBetween(startDate, endDate, wdConfig);
    const result = planManpower(quantity, workingDays, planningDepartments as ManpowerDepartment[], manpowerConstants, mastroMaterials);
    const plan = await prisma.manpowerPlan.create({
      data: {
        ocId,
        startDate,
        endDate,
        workingDays,
        requiredRate: result.requiredRate ?? undefined,
        status: result.status,
      },
    });
    if (result.status === "achievable") {
      await Promise.all(
        result.lines.map((l) =>
          prisma.manpowerPlanLine.create({
            data: {
              planId: plan.id,
              departmentId: l.departmentId,
              workersRequired: l.workers,
              workingDays: l.workingDays,
              workingHours: l.workingHours,
              manHours: l.manHours,
              utilisation: l.utilisation,
            },
          })
        )
      );
    }
  }

  await seedManpowerPlan(oc1.id, 100, daysAgo(3), 14);
  await seedManpowerPlan(oc2.id, 250, daysAgo(5), 25);
  await seedManpowerPlan(oc3.id, 50, daysAgo(19), 10);

  console.log("Seed complete.");
  console.log(`Stages: ${stageList.join(" -> ")}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
