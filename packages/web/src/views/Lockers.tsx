import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  HStack,
  Input,
  Spinner,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { LuPencil, LuPlus, LuRefreshCw } from "react-icons/lu";
import { useEffect, useState } from "react";
import type { CreateLockerRequest, LockerDTO, LockerStatus, MemberDTO, UpdateLockerRequest } from "@alentapp/shared";
import { lockersService } from "../services/lockers";
import { membersService } from "../services/members";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogActionTrigger,
  DialogCloseTrigger,
} from "../components/ui/dialog";
import { Field } from "../components/ui/field";
import {
  SelectRoot,
  SelectTrigger,
  SelectValueText,
  SelectContent,
  SelectItem,
  createListCollection,
} from "../components/ui/select";

type LockerFormData = CreateLockerRequest & {
  status: LockerStatus;
  member_id: string;
};

const initialFormData: LockerFormData = {
  number: 1,
  location: "",
  status: "Available",
  member_id: "",
};

const statusCollection = createListCollection({
  items: [
    { label: "Disponible", value: "Available" },
    { label: "Ocupado", value: "Occupied" },
    { label: "Mantenimiento", value: "Maintenance" },
  ],
});

export function LockersView() {
  const [lockers, setLockers] = useState<LockerDTO[]>([]);
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLockerId, setEditingLockerId] = useState<string | null>(null);
  const [formData, setFormData] = useState<LockerFormData>(initialFormData);

  const memberCollection = createListCollection({
    items: [
      { label: "Sin socio asignado", value: "none" },
      ...members.map((member) => ({ label: member.name, value: member.id })),
    ],
  });

  const fetchLockers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [lockersData, membersData] = await Promise.all([
        lockersService.getAll(),
        membersService.getAll(),
      ]);
      setLockers(lockersData);
      setMembers(membersData);
    } catch (err: any) {
      setError(err.message || "Error al cargar los casilleros");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingLockerId(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const openEditModal = (locker: LockerDTO) => {
    setEditingLockerId(locker.id);
    setFormData({
      number: locker.number,
      location: locker.location,
      status: locker.status,
      member_id: locker.member_id ?? "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingLockerId) {
        const updateData: UpdateLockerRequest = {
          number: formData.number,
          location: formData.location,
          status: formData.status,
          member_id: formData.member_id || null,
        };
        await lockersService.update(editingLockerId, updateData);
      } else {
        await lockersService.create({
          number: formData.number,
          location: formData.location,
        });
      }
      setFormData(initialFormData);
      setIsDialogOpen(false);
      fetchLockers();
    } catch (err: any) {
      alert(err.message || "Error al guardar el casillero");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMemberName = (memberId?: string | null) => {
    if (!memberId) {
      return "-";
    }

    return members.find((member) => member.id === memberId)?.name ?? memberId;
  };

  const getStatusBadgeColors = (status: LockerStatus) => {
    if (status === "Available") {
      return { bg: "green.50", color: "green.700" };
    }
    if (status === "Maintenance") {
      return { bg: "red.50", color: "red.700" };
    }
    return { bg: "orange.50", color: "orange.700" };
  };

  const getStatusLabel = (status: LockerStatus) => {
    return statusCollection.items.find((item) => item.value === status)?.label ?? status;
  };

  useEffect(() => {
    fetchLockers();
  }, []);

  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading size="2xl" fontWeight="bold">Administración de Casilleros</Heading>
            <Text color="fg.muted" fontSize="md">
              Registra casilleros disponibles para los socios de Alentapp.
            </Text>
          </Stack>
          <HStack gap="3">
            <Button variant="outline" onClick={fetchLockers} disabled={isLoading}>
              <LuRefreshCw /> Actualizar
            </Button>
            <Button colorPalette="blue" size="md" onClick={openCreateModal}>
              <LuPlus /> Agregar Casillero
            </Button>
          </HStack>
        </Flex>

        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingLockerId ? "Editar Casillero" : "Agregar Nuevo Casillero"}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                <Field label="Número" required>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: Number(e.target.value) })}
                    required
                  />
                </Field>
                <Field label="Ubicación" required>
                  <Input
                    placeholder="Ej. Vestuario A"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                </Field>
                {editingLockerId && (
                  <>
                    <Field label="Estado" required>
                      <SelectRoot
                        collection={statusCollection}
                        value={[formData.status]}
                        onValueChange={(e) =>
                          setFormData({ ...formData, status: e.value[0] as LockerStatus })
                        }
                      >
                        <SelectTrigger>
                          <SelectValueText placeholder="Seleccione un estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.member_id
                            ? statusCollection.items.map((item) => (
                              <SelectItem item={item} key={item.value}>
                                {item.value}
                              </SelectItem>
                            ))
                            : (
                              < SelectItem item={{label:'Ocupado', value:'ocuppied'}} key={'ocuppied'}>
                                Ocupado
                              </SelectItem>
                            )
                          }
                        </SelectContent>
                      </SelectRoot>
                    </Field>
                    <Field label="Socio asignado">
                      <SelectRoot
                        collection={memberCollection}
                        value={[formData.member_id || "none"]}
                        onValueChange={(e) =>
                          setFormData({
                            ...formData,
                            member_id: e.value[0] === "none" ? "" : e.value[0],
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValueText placeholder="Seleccione un socio" />
                        </SelectTrigger>
                        <SelectContent>
                          {memberCollection.items.map((item) => (
                            <SelectItem item={item} key={item.value}>
                              {item.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </SelectRoot>
                    </Field>
                  </>
                )}
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                {editingLockerId ? "Guardar Cambios" : "Crear Casillero"}
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </form>
        </DialogContent>

        {error && (
          <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
            <Text fontWeight="bold">Error:</Text>
            <Text>{error}</Text>
          </Box>
        )}

        <Box
          bg="bg.panel"
          borderRadius="xl"
          boxShadow="sm"
          borderWidth="1px"
          overflow="hidden"
          minH="300px"
          position="relative"
        >
          {isLoading ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Spinner size="xl" color="blue.500" />
                <Text color="fg.muted">Cargando casilleros...</Text>
              </Stack>
            </Center>
          ) : lockers.length === 0 ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Text color="fg.muted">No se encontraron casilleros.</Text>
                <Button variant="ghost" onClick={fetchLockers}>Reintentar</Button>
              </Stack>
            </Center>
          ) : (
            <Table.Root size="md" variant="line" interactive>
              <Table.Header>
                <Table.Row bg="bg.muted/50">
                  <Table.ColumnHeader py="4">Número</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Ubicación</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Estado</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Socio Asignado</Table.ColumnHeader>
                  <Table.ColumnHeader py="4" textAlign="end">Acciones</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {lockers.map((locker) => {
                  const badgeColors = getStatusBadgeColors(locker.status);

                  return (
                    <Table.Row key={locker.id} _hover={{ bg: "bg.muted/30" }}>
                      <Table.Cell fontWeight="semibold" color="fg.emphasized">
                        {locker.number}
                      </Table.Cell>
                      <Table.Cell color="fg.muted">{locker.location}</Table.Cell>
                      <Table.Cell>
                        <Box
                          display="inline-block"
                          px="2"
                          py="0.5"
                          borderRadius="md"
                          bg={badgeColors.bg}
                          color={badgeColors.color}
                          fontSize="xs"
                          fontWeight="bold"
                        >
                          {getStatusLabel(locker.status)}
                        </Box>
                      </Table.Cell>
                      <Table.Cell color="fg.muted">{getMemberName(locker.member_id)}</Table.Cell>
                      <Table.Cell textAlign="end">
                        <HStack gap="2" justify="flex-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(locker)}
                          >
                            <LuPencil /> Editar
                          </Button>
                        </HStack>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          )}
        </Box>
      </Stack>
    </DialogRoot >
  );
}
